import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/shared/db/client";
import { verifyPassword } from "@/shared/auth/password";
import type { UserRole } from "@/shared/auth/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email, isActive: true, deletedAt: null },
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
            facilityAssignments: {
              include: { facility: true },
            },
          },
        });

        if (!user) return null;

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.userRoles.map((ur) => ur.role.name) as UserRole[],
          permissions: user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => rp.permission.name)
          ),
          facilities: user.facilityAssignments.map((fa) => ({
            id: fa.facility.id,
            code: fa.facility.code,
            name: fa.facility.name,
            isPrimary: fa.isPrimary,
          })),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.id = u.id;
        token.roles = u.roles;
        token.permissions = u.permissions;
        token.facilities = u.facilities;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).roles = token.roles;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).permissions = token.permissions;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).facilities = token.facilities;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = request.nextUrl.pathname === "/login";
      const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth");
      const isHealthCheck = request.nextUrl.pathname.startsWith("/api/health");

      if (isApiAuth || isHealthCheck) return true;
      if (isLoginPage) return !isLoggedIn ? true : Response.redirect(new URL("/", request.nextUrl));
      return isLoggedIn;
    },
  },
});
