import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname } = req.nextUrl;
  const needsOnboarding = Boolean(
    (req.auth?.user as { needsOnboarding?: boolean } | undefined)
      ?.needsOnboarding,
  );

  if (pathname.startsWith("/app") && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/app") && isLoggedIn && needsOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
  }

  if (pathname === "/onboarding" && isLoggedIn && !needsOnboarding) {
    return NextResponse.redirect(new URL("/app", req.nextUrl.origin));
  }

  if (pathname === "/onboarding" && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if ((pathname === "/login" || pathname === "/signup") && isLoggedIn) {
    if (needsOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
    }
    return NextResponse.redirect(new URL("/app", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*", "/login", "/signup", "/onboarding"],
};
