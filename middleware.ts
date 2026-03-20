import NextAuth from "next-auth";

import authConfig from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

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
    "/login"
  ]
};
