import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/app") && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/signup") && isLoggedIn) {
    return NextResponse.redirect(new URL("/app", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
