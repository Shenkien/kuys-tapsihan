import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
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
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // Optional: informational "you're also signed in elsewhere" check.
        // This does NOT block or invalidate the other session — it just lets
        // the UI show a heads-up notice.
        const userAgent = request?.headers.get("user-agent") ?? "unknown";
        const now = new Date();
        const otherDeviceActive = Boolean(
          user.lastLoginAt &&
            user.lastLoginUserAgent &&
            user.lastLoginUserAgent !== userAgent &&
            now.getTime() - user.lastLoginAt.getTime() < 30 * 60_000 // active in the last 30 min
        );

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: now, lastLoginUserAgent: userAgent },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          otherDeviceActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
        token.otherDeviceActive = (user as { otherDeviceActive?: boolean }).otherDeviceActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "STAFF";
        session.user.otherDeviceActive = token.otherDeviceActive as boolean | undefined;
      }
      return session;
    },
  },
});
