import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { startProcess, pauseProcess, stopProcess, getContention } from "@/server/services/process-scheduler";

export const processRouter = createTRPCRouter({
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["DAEMON", "TRIGGERED", "BATCH"]),
      strategyId: z.string(),
      frequency: z.string().optional(),
      triggerSignal: z.string().optional(),
      playbook: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { playbook, ...rest } = input;
      return ctx.db.process.create({
        data: {
          ...rest,
          status: "STOPPED",
          playbook: playbook as Prisma.InputJsonValue,
        },
      });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      frequency: z.string().optional(),
      playbook: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, playbook, ...data } = input;
      return ctx.db.process.update({
        where: { id },
        data: { ...data, ...(playbook ? { playbook: playbook as Prisma.InputJsonValue } : {}) },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.process.update({ where: { id: input.id }, data: { status: "STOPPED" } });
    }),

  list: protectedProcedure
    .input(z.object({
      strategyId: z.string().optional(),
      status: z.enum(["RUNNING", "PAUSED", "STOPPED", "COMPLETED"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.process.findMany({
        where: {
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  start: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await startProcess(input.id);
      return { success: true };
    }),

  pause: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await pauseProcess(input.id);
      return { success: true };
    }),

  stop: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await stopProcess(input.id);
      return { success: true };
    }),

  getSchedule: protectedProcedure
    .input(z.object({ processId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.process.findUniqueOrThrow({
        where: { id: input.processId },
        select: { id: true, name: true, status: true, lastRunAt: true, nextRunAt: true, frequency: true },
      });
    }),

  getContention: adminProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return getContention(input.strategyId);
    }),
});
