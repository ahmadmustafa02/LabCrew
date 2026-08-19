/**
 * Simple in-process sliding-window rate limiter (per key).
 * Fine for single-node deploy; use Redis later for multi-instance.
 */
import { NextResponse } from "next/server";

const hits = new Map<string, number[]>();

export function checkRateLimit(input: {
  key: string;
  max: number;
  windowMs: number;
}): NextResponse | null {
  const now = Date.now();
  const windowStart = now - input.windowMs;
  const prev = hits.get(input.key) ?? [];
  const recent = prev.filter((t) => t > windowStart);
  if (recent.length >= input.max) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429 },
    );
  }
  recent.push(now);
  hits.set(input.key, recent);
  return null;
}
