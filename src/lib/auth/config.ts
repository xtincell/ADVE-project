import "./types";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isGodModeEmail } from "@/lib/auth/god-mode";

// Google OAuth n'est déclaré que si les deux secrets sont présents en env
// (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET). Sans clé, le provider n'est pas
// enregistré et le bouton « Continuer avec Google » reste masqué (login/page) :
// l'app boote identiquement sans clé (parité « ship-without-keys »).
const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // DURCI round-9 : `allowDangerousEmailAccountLinking` RETIRÉ. Il liait
            // Google à un compte email/mdp préexistant SANS vérifier la propriété
            // de l'email → pre-account hijacking. Défaut NextAuth (liaison explicite
            // requise) restauré.
          }),
        ]
      : []),
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

        // ── MFA challenge for effective-ADMIN (DB role OU god-mode) ──
        // Le privilège ADMIN god-mode est accordé PLUS TARD au callback JWT via
        // l'allowlist email (le rôle DB reste USER/FOUNDER) → gater le MFA sur le
        // seul rôle DB laissait les comptes les PLUS sensibles jamais challengés
        // (audit round-9). On calcule le rôle effectif ici.
        if (user.role === "ADMIN" || isGodModeEmail(user.email)) {
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
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
        token.id = user.id;
        token.email = (user as { email?: string }).email ?? token.email;
      }
      // Le jeton reste signé après la suppression du compte ou le retrait d'un
      // rôle. Hors connexion (où `authorize`/l'adaptateur viennent de lire la
      // ligne), on relit donc la ligne à chaque appel :
      //  - un compte supprimé n'a plus de session — `null` est la révocation
      //    d'Auth.js, qui efface aussi le cookie (plan 4.11.f) ;
      //  - le rôle stocké remplace celui du jeton. Auparavant il ne le
      //    remplaçait que sur `session.update()` ou pour un rôle absent/legacy
      //    hors canon (auto-heal de `20260503020000_normalize_user_roles`, qui
      //    reste couvert) : un ADMIN rétrogradé gardait ses droits sur sa
      //    session ouverte jusqu'à l'expiration du jeton (IN7, 2026-11-11).
      // Le god-mode n'est appliqué qu'à un compte existant, après la relecture.
      if (!user && token.id) {
        const stored = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (!stored) return null;
        token.role = stored.role || "USER";
      }
      // God mode — un compte founder de l'allowlist est TOUJOURS ADMIN, même
      // si la BDD prod n'a jamais été re-seedée (aucune écriture DB requise).
      if (isGodModeEmail(typeof token.email === "string" ? token.email : null)) {
        token.role = "ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        // Read the current assignment for each authenticated session. A missing
        // JWT field hid assigned brands; caching it there would retain revoked scopes.
        const assignment = await db.user.findUnique({
          where: { id: session.user.id }, select: { operatorId: true },
        });
        session.user.operatorId = assignment?.operatorId ?? null;
      }
      return session;
    },
  },
});
