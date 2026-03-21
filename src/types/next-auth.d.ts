import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      role: string;
      organizationName: string;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId?: string;
    role?: string;
    organizationName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string;
    role?: string;
    organizationName?: string;
  }
}
