import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "STAFF";
      /** True if this account was already active on a different device/browser very recently. Informational only. */
      otherDeviceActive?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "STAFF";
    otherDeviceActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "STAFF";
    otherDeviceActive?: boolean;
  }
}
