import bcrypt from "bcryptjs";
import { issueApiAccessToken } from "@/server/auth/api-tokens";
import { getPrisma } from "@/lib/db";

const loginHits = new Map<string, number[]>();
const LOGIN_WINDOW_MS = 10 * 60_000;
const LOGIN_MAX_PER_WINDOW = 12;

export type MobileLoginInput = {
  email: string;
  password: string;
  deviceName: string;
};

export type MobileLoginOk = {
  token: string;
  tokenId: string;
  expiresAt: Date | null;
  user: {
    id: string;
    email: string;
    name: string;
    role: "student" | "director";
    memberId: string;
    programId: string;
    organizationId: string;
    programName: string;
    organizationName: string;
  };
};

export function parseMobileLoginBody(body: unknown): MobileLoginInput | { error: string } {
  if (body === null || typeof body !== "object") {
    return { error: "Email and password are required" };
  }
  const record = body as Record<string, unknown>;
  const email = String(record.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(record.password ?? "");
  const deviceName = String(record.deviceName ?? "LabCrew Field").trim() || "LabCrew Field";

  if (!email.includes("@") || password.length < 1) {
    return { error: "Email and password are required" };
  }
  if (deviceName.length > 80) {
    return { error: "Device name is too long" };
  }
  return { email, password, deviceName };
}

export function checkLoginRateLimit(email: string): boolean {
  const now = Date.now();
  const windowStart = now - LOGIN_WINDOW_MS;
  const key = email.toLowerCase();
  const recent = (loginHits.get(key) ?? []).filter((t) => t > windowStart);
  if (recent.length >= LOGIN_MAX_PER_WINDOW) {
    loginHits.set(key, recent);
    return false;
  }
  recent.push(now);
  loginHits.set(key, recent);
  return true;
}

export async function loginAndIssueToken(
  input: MobileLoginInput,
): Promise<MobileLoginOk | { error: string; status: number }> {
  if (!checkLoginRateLimit(input.email)) {
    return { error: "Too many sign-in attempts. Try again in a few minutes.", status: 429 };
  }

  const prisma = getPrisma();
  let userRow;
  try {
    userRow = await prisma.user.findUnique({ where: { email: input.email } });
  } catch {
    return {
      error: "Lab database is not ready. Start Docker (postgres on port 5434) and try again.",
      status: 503,
    };
  }
  if (!userRow?.passwordHash) {
    return { error: "Email or password is incorrect", status: 401 };
  }
  const ok = await bcrypt.compare(input.password, userRow.passwordHash);
  if (!ok) {
    return { error: "Email or password is incorrect", status: 401 };
  }

  const { resolveActiveMembership } = await import("@/server/auth/active-membership");
  const active = await resolveActiveMembership(userRow.id);
  if (!active?.membership) {
    return { error: "Finish lab onboarding on the web app first", status: 403 };
  }

  const issued = await issueApiAccessToken({
    userId: userRow.id,
    organizationId: active.membership.organizationId,
    programId: active.membership.programId,
    memberId: active.membership.id,
    name: input.deviceName,
  });

  return {
    token: issued.token,
    tokenId: issued.id,
    expiresAt: issued.expiresAt,
    user: {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: active.membership.role === "STUDENT" ? "student" : "director",
      memberId: active.membership.id,
      programId: active.membership.programId,
      organizationId: active.membership.organizationId,
      programName: active.membership.programName,
      organizationName: active.membership.organizationName,
    },
  };
}
