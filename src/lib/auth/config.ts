import "./types";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(db),
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
        // MFA TOTP code (only required for ADMIN role with MfaSecret enrolled).
        mfaCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.hashedPassword) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword,
        );
        if (!isValid) return null;

        // ── MFA challenge for ADMIN role ──
        if (user.role === "ADMIN") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mfaSecret = await (db as any).mfaSecret?.findUnique?.({
            where: { userId: user.id },
          }).catch(() => null);
          if (mfaSecret?.secret) {
            const code = (credentials.mfaCode as string | undefined)?.trim();
            if (!code) {
              throw new Error("MFA code required for admin");
            }
            const { verifyTotp } = await import("@/server/services/mfa");
            if (!verifyTotp(mfaSecret.secret, code)) {
              throw new Error("Invalid MFA code");
            }
          }
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
        token.id = user.id;
      }
      // Auto-heal des sessions pré-migration `20260503020000_normalize_user_roles` :
      // un JWT signé avant la migration peut porter un role legacy hors canon
      // (cf. proxy.ts COCKPIT_ROLES/CREATOR_ROLES). Sans re-fetch, l'user reste
      // bloqué sur /unauthorized même après que la BDD a été normalisée.
      // Forcer la relecture si le role est absent OU hors set canonique OU
      // explicitement demandé via session.update().
      const CANONICAL_ROLES = new Set([
        "ADMIN", "OPERATOR", "USER", "FOUNDER", "BRAND",
        "CLIENT_RETAINER", "CLIENT_STATIC", "CREATOR", "FREELANCE", "AGENCY",
      ]);
      const role = typeof token.role === "string" ? token.role : null;
      if (token.id && (trigger === "update" || !role || !CANONICAL_ROLES.has(role))) {
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (fresh) token.role = fresh.role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
