import type { NextAuthConfig } from "next-auth";

const authConfig = {
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
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    }
  },
  providers: []
} satisfies NextAuthConfig;

export default authConfig;
