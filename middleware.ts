import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/ops",
  "/jobs",
  "/candidates",
  "/applications",
  "/pipeline",
  "/interviews",
  "/analytics",
  "/knowledge",
  "/chat",
  "/communications",
  "/settings",
  "/employees",
  "/hiring",
  "/requests",
  "/people",
  "/me"
];

function hasSession(request: NextRequest) {
  return [
    "__Secure-authjs.session-token",
    "authjs.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.session-token"
  ].some((cookieName) => request.cookies.has(cookieName));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoggedIn = hasSession(request);
  const isAppRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = pathname.startsWith("/login");

  if (isAppRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ops/:path*",
    "/jobs/:path*",
    "/candidates/:path*",
    "/applications/:path*",
    "/pipeline/:path*",
    "/interviews/:path*",
    "/analytics/:path*",
    "/knowledge/:path*",
    "/chat/:path*",
    "/communications/:path*",
    "/settings/:path*",
    "/employees/:path*",
    "/hiring/:path*",
    "/requests/:path*",
    "/people/:path*",
    "/me/:path*",
    "/login"
  ]
};
