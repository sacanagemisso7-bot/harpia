import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      organizationId: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    organizationId?: string;
    role?: string;
  }
}
