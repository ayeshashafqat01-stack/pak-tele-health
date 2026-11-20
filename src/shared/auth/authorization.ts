import { auth } from "@/shared/auth/config";
import type { AuthorizationContext, SessionUser, UserRole } from "@/shared/auth/types";

export async function getAuthContext(): Promise<AuthorizationContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as SessionUser;
  return {
    userId: user.id,
    roles: user.roles,
    permissions: user.permissions,
    facilityIds: user.facilities.map((f) => f.id),
  };
}

export async function requireAuth(): Promise<AuthorizationContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new AuthorizationError("Authentication required");
  }
  return ctx;
}

export function requireRole(ctx: AuthorizationContext, ...roles: UserRole[]): void {
  if (!roles.some((role) => ctx.roles.includes(role))) {
    throw new AuthorizationError(
      `Required role: ${roles.join(" or ")}`
    );
  }
}

export function requirePermission(ctx: AuthorizationContext, permission: string): void {
  if (!ctx.permissions.includes(permission)) {
    throw new AuthorizationError(
      `Required permission: ${permission}`
    );
  }
}

export function requireFacilityAccess(
  ctx: AuthorizationContext,
  facilityId: string
): void {
  // Admins can access any facility
  if (ctx.roles.includes("ADMIN")) return;

  if (!ctx.facilityIds.includes(facilityId)) {
    throw new AuthorizationError("Access denied: facility not assigned");
  }
}

export function hasPermission(ctx: AuthorizationContext, permission: string): boolean {
  return ctx.permissions.includes(permission);
}

export function hasRole(ctx: AuthorizationContext, role: UserRole): boolean {
  return ctx.roles.includes(role);
}

export class AuthorizationError extends Error {
  public readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  public readonly statusCode = 401;

  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}
