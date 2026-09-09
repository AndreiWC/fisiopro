import NextAuth from "next-auth";
import prisma from "./prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { verifyLoginCode } from "./patient-otp";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  trustHost: true,
  // Credentials exige sessão JWT (não é compatível com o adapter de sessão em banco).
  session: { strategy: "jwt" },
  providers: [
    GitHub,
    Google({
      // Google verifica o e-mail (openid "email_verified") — seguro linkar contas
      // OAuth e de código por e-mail que compartilham o mesmo endereço.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "email-code",
      name: "Código por e-mail",
      credentials: {
        email: { label: "E-mail", type: "email" },
        code: { label: "Código", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const code = credentials?.code;
        if (typeof email !== "string" || typeof code !== "string") return null;

        const valid = await verifyLoginCode(email, code);
        if (!valid) return null;

        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.upsert({
          where: { email: normalizedEmail },
          create: { email: normalizedEmail, emailVerified: new Date() },
          update: { emailVerified: new Date() },
        });

        return user;
      },
    }),
  ],
  callbacks: {
    // Sessão em banco populava name/email/image automaticamente via adapter; em JWT
    // isso precisa ser copiado à mão para token e depois para a sessão.
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.email) session.user.email = token.email;
      if (token.name) session.user.name = token.name as string;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },
});
