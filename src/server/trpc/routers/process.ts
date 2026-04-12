// ============================================================================
// MODULE M23 — Process Scheduler
// Score: 70/100 | Priority: P3 | Status: FUNCTIONAL
// Spec: §4.3 | Division: La Fusée
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  create, update, delete, list — basic CRUD
// [x] REQ-2  start, pause, stop — lifecycle management
// [x] REQ-3  getContention — detect resource conflicts
// [ ] REQ-4  getSchedule — calendar view of scheduled processes
// [ ] REQ-5  Cron-like recurring process execution (DAEMON type)
// [ ] REQ-6  Triggered process execution (on events like signal.create)
// [ ] REQ-7  Batch process execution (nightly aggregations)
// [ ] REQ-8  Alerts on process stop/failure
// [ ] REQ-9  Contention management (detect overlapping resource usage)
//
// PROCEDURES: create, update, delete, list, start, pause, stop,
//             getSchedule, getContention
// ============================================================================

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
