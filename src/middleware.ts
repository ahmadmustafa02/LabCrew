import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { CORS_HEADERS } from "@/server/http/cors";

const { auth } = NextAuth(authConfig);

function withCors(response: NextResponse) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Auth gate only. Onboarding completion is enforced in server layouts via
 * DB membership — JWT `needsOnboarding` is too easy to get stuck stale after
 * Google sign-in / lab setup, which bounced users forever on /onboarding.
 */
export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    if (req.method === "OPTIONS") {
      return withCors(new NextResponse(null, { status: 204 }));
    }
    return withCors(NextResponse.next());
  }

  if (pathname.startsWith("/app") && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/onboarding" && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if ((pathname === "/login" || pathname === "/signup") && isLoggedIn) {
    const next = req.nextUrl.searchParams.get("next");
    const dest = next && next.startsWith("/app") ? next : "/app";
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*", "/login", "/signup", "/onboarding", "/api/:path*"],
};
