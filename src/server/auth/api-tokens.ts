import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

const TOKEN_PREFIX = "lc_";

/** Per-process bearer rate limit (token hash → timestamps). */
const bearerHits = new Map<string, number[]>();
const BEARER_WINDOW_MS = 60_000;
const BEARER_MAX_PER_WINDOW = 120;

export function hashApiToken(plain: string) {
  return createHash("sha256").update(plain).digest("hex");
}

export function generateApiTokenPlain() {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("hex")}`;
}

export type IssueApiAccessTokenInput = {
  userId: string;
  organizationId: string;
  programId: string;
  memberId: string;
  name: string;
  /** Default: 90 days. Pass null for non-expiring (dev/tests only). */
  expiresAt?: Date | null;
};

/**
 * Issue a lab-scoped bearer token for mobile / API clients.
 * Bound to a single organizationId (+ program/member) at issue time.
 * Returns the plaintext once; only the hash is stored.
 */
export async function issueApiAccessToken(input: IssueApiAccessTokenInput) {
  const plain = generateApiTokenPlain();
  const tokenHash = hashApiToken(plain);
  const tokenPrefix = plain.slice(0, 11); // "lc_" + 8 hex chars
  const expiresAt =
    input.expiresAt === undefined
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      : input.expiresAt;

  const row = await getPrisma().apiAccessToken.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      programId: input.programId,
      memberId: input.memberId,
      name: input.name,
      tokenHash,
      tokenPrefix,
      expiresAt,
    },
  });

  return { id: row.id, token: plain, expiresAt: row.expiresAt };
}

export async function revokeApiAccessToken(tokenId: string, labId: string) {
  const prisma = getPrisma();
  const existing = await prisma.apiAccessToken.findFirst({
    where: { id: tokenId, organizationId: labId, revokedAt: null },
  });
  if (!existing) return null;
  return prisma.apiAccessToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}

export type ResolvedBearer = {
  userId: string;
  memberId: string;
  organizationId: string;
  programId: string;
  tokenId: string;
};

/**
 * Sliding-window rate limit for bearer tokens (separate from session cookies).
 * Returns a 429 Response when exceeded, else null.
 */
export function checkBearerRateLimit(tokenHash: string): NextResponse | null {
  const now = Date.now();
  const windowStart = now - BEARER_WINDOW_MS;
  const prev = bearerHits.get(tokenHash) ?? [];
  const recent = prev.filter((t) => t > windowStart);
  if (recent.length >= BEARER_MAX_PER_WINDOW) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429 },
    );
  }
  recent.push(now);
  bearerHits.set(tokenHash, recent);
  return null;
}

/** Resolve a Bearer token to a lab-scoped principal, or null. */
export async function resolveBearerToken(
  plain: string,
): Promise<ResolvedBearer | null> {
  if (!plain.startsWith(TOKEN_PREFIX) || plain.length < 20) return null;

  const prisma = getPrisma();
  const tokenHash = hashApiToken(plain);
  const row = await prisma.apiAccessToken.findUnique({
    where: { tokenHash },
  });

  if (!row || row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  void prisma.apiAccessToken
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    userId: row.userId,
    memberId: row.memberId,
    organizationId: row.organizationId,
    programId: row.programId,
    tokenId: row.id,
  };
}

export function bearerTokenHashForLimit(plain: string) {
  return hashApiToken(plain);
}
