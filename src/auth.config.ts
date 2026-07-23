import type { NextAuthConfig } from "next-auth";

/**
 * Config "légère", sans provider ni accès Prisma, utilisée par le middleware
 * (Edge Runtime : pas de modules Node comme ceux dont Prisma a besoin).
 * La config complète (avec le provider Credentials + Prisma) est dans auth.ts,
 * utilisée uniquement côté Node (Server Components, route handlers, actions).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
