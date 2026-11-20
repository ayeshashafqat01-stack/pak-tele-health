import type { UserRole, UserFacility } from "@/shared/auth/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: UserRole[];
      permissions: string[];
      facilities: UserFacility[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: UserRole[];
    permissions: string[];
    facilities: UserFacility[];
  }
}
