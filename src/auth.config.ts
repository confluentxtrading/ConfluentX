import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { getUserByEmail } from "@/lib/data/user";
import { loginSchema } from "@/lib/validators/auth";

/**
 * Provider configuration.
 *
 * Future providers — enable by adding env vars and uncommenting:
 *
 *   import Discord from "next-auth/providers/discord";
 *   import GitHub from "next-auth/providers/github";
 *   ...
 *   Discord({ clientId: process.env.AUTH_DISCORD_ID, clientSecret: process.env.AUTH_DISCORD_SECRET }),
 *   GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET }),
 */
export default {
  providers: [
    Google,
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await getUserByEmail(parsed.data.email);
        if (!user?.passwordHash) return null; // OAuth-only account

        const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        return passwordValid ? user : null;
      },
    }),
  ],
} satisfies NextAuthConfig;
