import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../init";

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
      if (existing) {
        const user = await ctx.db.user.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            hashedPassword,
          },
        });
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

      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await ctx.db.user.update({
          where: { id: user.id },
          data: { resetToken, resetTokenExpiry },
        });

        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

        const { sendEmail, renderPasswordResetEmail } = await import("@/server/services/email");
        const rendered = renderPasswordResetEmail({ resetUrl, userName: user.name ?? undefined });
        await sendEmail({
          to: user.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tag: "password-reset",
        }).catch((err) => {
          console.error("[auth:forgotPassword] email send failed:", err);
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
   * Get current user info (returns null if not authenticated).
   */
  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.session?.user) return null;
    return {
      id: ctx.session.user.id,
      role: ctx.session.user.role ?? "USER",
    };
  }),
});
