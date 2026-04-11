import type { NextAuthConfig } from "next-auth";

import { DEFAULT_AUTH_REDIRECT, normalizeCallbackUrl } from "@/lib/auth/callback-url";

const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login"
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;
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
        "/settings"
      ];
      const isAppRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
      const isAuthRoute = pathname.startsWith("/login");

      if (isAppRoute) {
        return isLoggedIn;
      }

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.nextUrl));
      }

      return true;
    },
    redirect({ url, baseUrl }) {
      return normalizeCallbackUrl(url, baseUrl);
    }
  },
  providers: []
} satisfies NextAuthConfig;

export default authConfig;
