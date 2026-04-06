import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../init";

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
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Un compte existe deja avec cet email.",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);

      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          hashedPassword,
          role: "USER",
        },
      });

      return { id: user.id, email: user.email };
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

        // TODO: Send email with reset link containing the token
        // For now, log the token in dev mode
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[DEV] Reset link: ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${resetToken}`,
          );
        }
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
