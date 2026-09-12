import { NextResponse } from "next/server";
import {
  loginAndIssueToken,
  parseMobileLoginBody,
} from "@/server/auth/mobile-login";
import { CORS_HEADERS } from "@/server/http/cors";

export const runtime = "nodejs";

function json(
  body: unknown,
  init?: { status?: number },
) {
  const res = NextResponse.json(body, init);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export async function POST(request: Request) {
  try {
    const parsed = parseMobileLoginBody(await request.json());
    if ("error" in parsed) {
      return json({ ok: false, error: parsed.error }, { status: 400 });
    }

    const result = await loginAndIssueToken(parsed);
    if ("error" in result) {
      return json({ ok: false, error: result.error }, { status: result.status });
    }

    return json({
      ok: true,
      token: result.token,
      tokenId: result.tokenId,
      expiresAt: result.expiresAt,
      user: result.user,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Sign-in failed",
      },
      { status: 503 },
    );
  }
}
