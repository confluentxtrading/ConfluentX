import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import authConfig from "@/auth.config";
import { getTwoFactorConfirmationByUserId, getUserById } from "@/lib/data/user";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/mail";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  events: {
    // OAuth sign-ins are implicitly email-verified by the provider.
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
    // Fires for adapter-created users (OAuth). Credentials users are
    // provisioned in /api/auth/register instead.
    async createUser({ user }) {
      if (!user.id) return;
      await db.userSettings.create({ data: { userId: user.id } }).catch(() => {});
      await db.subscription.create({ data: { userId: user.id } }).catch(() => {});
      if (user.email) {
        await sendWelcomeEmail({ to: user.email, name: user.name });
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth: always allowed (verification handled by provider).
      if (account?.provider !== "credentials") return true;
      if (!user.id) return false;

      const existingUser = await getUserById(user.id);

      // Block credentials sign-in until the email is verified.
      if (!existingUser?.emailVerified) return false;

      // 2FA: the /api/auth/login route creates a TwoFactorConfirmation after
      // a valid code. Its presence here is the proof — consume it.
      if (existingUser.isTwoFactorEnabled) {
        const confirmation = await getTwoFactorConfirmationByUserId(existingUser.id);
        if (!confirmation) return false;
        await db.twoFactorConfirmation.delete({ where: { id: confirmation.id } });
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      // Only hit the database on sign-in or explicit session refresh.
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
        token.isTwoFactorEnabled =
          (user as { isTwoFactorEnabled?: boolean }).isTwoFactorEnabled ?? false;
        return token;
      }
      if (trigger === "update" && token.sub) {
        const freshUser = await getUserById(token.sub);
        if (freshUser) {
          token.name = freshUser.name;
          token.email = freshUser.email;
          token.picture = freshUser.image;
          token.role = freshUser.role;
          token.isTwoFactorEnabled = freshUser.isTwoFactorEnabled;
        }
      }
      return token;
    },
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
        session.user.isTwoFactorEnabled = Boolean(token.isTwoFactorEnabled);
      }
      return session;
    },
  },
  ...authConfig,
});
