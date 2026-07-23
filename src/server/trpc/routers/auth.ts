import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../init";

/* lafusee:public-auth — strangler N/A on publicProcedure (no operator binding pre-auth) */


export const authRouter = createTRPCRouter({
  /**
   * Register a new user account.
   */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        companyName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await ctx.db.user.findUnique({ where: { email } });

      // Real account already exists (with password) — refuse.
      if (existing?.hashedPassword) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Un compte existe deja avec cet email.",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Claim path: a stub User was provisioned by `quickIntake.activateBrand`.
      // Set the password + name on the existing row so the prospect inherits
      // the Client + Strategy that were already created in their name.
      // P1-2 (audit onboarding 2026-07-19) — email de bienvenue : aucune
      // inscription n'envoyait quoi que ce soit. Best-effort, jamais bloquant.
      const sendWelcome = (to: string, name: string) => {
        void import("@/server/services/email").then(({ sendEmail }) => {
          const base = (process.env.NEXTAUTH_URL ?? "https://powerupgraders.com").replace(/\/$/, "");
          return sendEmail({
            to,
            subject: "Bienvenue — votre espace de marque est ouvert",
            tag: "welcome",
            html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a"><p style="font-weight:bold;font-size:17px">Bienvenue ${name},</p><p>Votre espace est prêt. Les trois premiers gestes qui comptent :</p><ol style="padding-left:18px"><li>Connectez vos réseaux sociaux (vos audiences se relèvent automatiquement chaque jour)</li><li>Déposez votre logo</li><li>Déclarez l'échelle de votre marché — votre score s'affiche dans le bon référentiel</li></ol><p style="margin:20px 0"><a href="${base}/cockpit" style="background:#E56458;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Ouvrir mon espace</a></p></div>`,
            text: `Bienvenue ${name} — ouvrez votre espace : ${base}/cockpit`,
          });
        }).catch(() => {});
      };

      if (existing) {
        const user = await ctx.db.user.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            hashedPassword,
          },
        });
        sendWelcome(user.email, input.name);
        return { id: user.id, email: user.email, claimed: true };
      }

      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email,
          hashedPassword,
          role: "USER",
        },
      });

      sendWelcome(user.email, input.name);
      return { id: user.id, email: user.email, claimed: false };
    }),

  /**
   * Request a password reset link. Always returns success to avoid email enumeration.
   */
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      // Anti-énumération PAR TIMING (audit round-9) : le corps AWAITait la MAJ DB
      // + l'envoi email (SMTP) → ~centaines de ms de plus quand l'email EXISTE. La
      // réponse est constante (`{success:true}`) mais le DÉLAI révélait les emails
      // inscrits. On DÉTACHE la MAJ+envoi (fire-and-forget) → temps de réponse
      // identique que l'email existe ou non.
      if (user) {
        const captured = user;
        void (async () => {
          const resetToken = crypto.randomBytes(32).toString("hex");
          const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
          await ctx.db.user.update({
            where: { id: captured.id },
            data: { resetToken, resetTokenExpiry },
          });
          const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
          const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
          const { sendEmail, renderPasswordResetEmail } = await import("@/server/services/email");
          const rendered = renderPasswordResetEmail({ resetUrl, userName: captured.name ?? undefined });
          await sendEmail({
            to: captured.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            tag: "password-reset",
          });
        })().catch((err) => {
          console.error("[auth:forgotPassword] background reset failed:", err instanceof Error ? err.message : err);
        });
      }

      // Always return success to prevent email enumeration
      return { success: true };
    }),

  /**
   * Reset password using a valid token.
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: {
          resetToken: input.token,
          resetTokenExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ce lien de reinitialisation est invalide ou a expire.",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);

      await ctx.db.user.update({
        where: { id: user.id },
        data: {
          hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return { success: true };
    }),

  /**
   * Change son propre mot de passe (compte authentifié). Vérifie le mot de
   * passe courant puis pose le nouveau (bcrypt 12) et lève l'invitation
   * provisoire. Compte sécurité perso — pas une mutation métier de marque.
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { id: true, hashedPassword: true },
      });
      if (!user?.hashedPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Aucun mot de passe défini sur ce compte." });
      }
      const ok = await bcrypt.compare(input.currentPassword, user.hashedPassword);
      if (!ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le mot de passe actuel est incorrect." });
      }
      const hashedPassword = await bcrypt.hash(input.newPassword, 12);
      await ctx.db.user.update({
        where: { id: user.id },
        data: { hashedPassword, passwordChangeInvited: false },
      });
      return { success: true };
    }),

  /** Écarte l'invitation à changer de mot de passe (elle peut le faire plus tard). */
  dismissPasswordInvite: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: { passwordChangeInvited: false },
    });
    return { success: true };
  }),

  /** Enregistre la préférence de thème (mode jour/nuit) de l'utilisateur. */
  setThemePreference: protectedProcedure
    .input(z.object({ theme: z.enum(["light", "dark"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { themePreference: input.theme },
      });
      return { success: true };
    }),

  /**
   * Get current user info (returns null if not authenticated).
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null;
    const role = ctx.session.user.role ?? "USER";
    // canOperate mirrors operatorProcedure (init.ts): ADMIN, or any user linked
    // to an Operator. Exposed so the client can render operator-only controls
    // honestly — shown enabled only when usable — instead of failing on click
    // with FORBIDDEN (founders are not operators; UPgraders operates the OS).
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { operatorId: true, themePreference: true, passwordChangeInvited: true },
    });
    const canOperate = role === "ADMIN" || !!user?.operatorId;
    return {
      id: ctx.session.user.id,
      role,
      canOperate,
      themePreference: user?.themePreference ?? null,
      passwordChangeInvited: user?.passwordChangeInvited ?? false,
    };
  }),
});
