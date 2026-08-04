import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        identifiant: { label: "Identifiant", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        const identifiant = credentials?.identifiant;
        const password = credentials?.password;
        if (typeof identifiant !== "string" || typeof password !== "string") {
          return null;
        }
        // Insensible à la casse et aux espaces autour : personne ne doit rester
        // à la porte parce qu'il a tapé "camille" ou « Camille » avec un espace.
        const user = await prisma.user.findFirst({
          where: { identifiant: { equals: identifiant.trim(), mode: "insensitive" } },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
