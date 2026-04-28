/**
 * Learning / Académie Router — Courses, enrollments, certifications
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "learning");
const _auditedAdmin = auditedProcedure(adminProcedure, "learning");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const learningRouter = createTRPCRouter({
  // === COURSES ===
  createCourse: adminProcedure
    .input(z.object({
      title: z.string(), slug: z.string(), description: z.string().optional(),
      level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
      category: z.string(), pillarFocus: z.string().optional(),
      content: z.record(z.unknown()), duration: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.course.create({ data: { ...input, content: input.content as Prisma.InputJsonValue } });
    }),

  listCourses: protectedProcedure
    .input(z.object({ category: z.string().optional(), level: z.string().optional(), published: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.course.findMany({
        where: {
          ...(input.category ? { category: input.category } : {}),
          ...(input.level ? { level: input.level as never } : {}),
          ...(input.published !== undefined ? { isPublished: input.published } : {}),
        },
        orderBy: { order: "asc" },
      });
    }),

  getCourse: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.course.findUniqueOrThrow({ where: { slug: input.slug }, include: { enrollments: true } });
    }),

  publishCourse: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => ctx.db.course.update({ where: { id: input.id }, data: { isPublished: true } })),

  // === ENROLLMENTS ===
  enroll: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.enrollment.create({ data: { courseId: input.courseId, userId } });
    }),

  updateProgress: protectedProcedure
    .input(z.object({ courseId: z.string(), progress: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const data: Record<string, unknown> = { progress: input.progress };
      if (input.progress >= 100) {
        data.status = "COMPLETED";
        data.completedAt = new Date();
      } else {
        data.status = "IN_PROGRESS";
      }
      return ctx.db.enrollment.update({
        where: { courseId_userId: { courseId: input.courseId, userId } },
        data: data as Prisma.EnrollmentUpdateInput,
      });
    }),

  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.enrollment.findMany({
      where: { userId: ctx.session.user.id },
      include: { course: true },
      orderBy: { updatedAt: "desc" },
    });
  }),

  // === CERTIFICATIONS ===
  issueCertification: adminProcedure
    .input(z.object({ talentProfileId: z.string(), name: z.string(), category: z.string(), expiresAt: z.date().optional() }))
    .mutation(async ({ ctx, input }) => ctx.db.talentCertification.create({ data: input })),

  getCertifications: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.talentCertification.findMany({ where: { talentProfileId: input.talentProfileId }, orderBy: { issuedAt: "desc" } });
    }),
});
