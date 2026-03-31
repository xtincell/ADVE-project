import { db } from "@/lib/db";
import type { ProcessType, ProcessStatus, Prisma } from "@prisma/client";

interface CreateProcessData {
  strategyId?: string;
  type: ProcessType;
  name: string;
  description?: string;
  frequency?: string;
  triggerSignal?: string;
  priority?: number;
  driverId?: string;
  assigneeId?: string;
  playbook?: Record<string, unknown>;
}

interface ScheduleEntry {
  id: string;
  name: string;
  type: ProcessType;
  status: ProcessStatus;
  priority: number;
  frequency: string | null;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  runCount: number;
  assigneeId: string | null;
}

interface ContentionReport {
  runningProcesses: number;
  pendingMissions: number;
  bottlenecks: string[];
  concurrentByPriority: Record<string, number>;
  overlapWindows: Array<{ processIds: string[]; reason: string }>;
}

/**
 * Create a new process (DAEMON/TRIGGERED/BATCH).
 */
export async function createProcess(data: CreateProcessData) {
  const nextRunAt = data.frequency ? computeNextRun(data.frequency) : null;

  const process = await db.process.create({
    data: {
      strategyId: data.strategyId,
      type: data.type,
      name: data.name,
      description: data.description,
      status: "STOPPED",
      frequency: data.frequency,
      triggerSignal: data.triggerSignal,
      priority: data.priority ?? 5,
      driverId: data.driverId,
      assigneeId: data.assigneeId,
      playbook: (data.playbook ?? {}) as Prisma.InputJsonValue,
      nextRunAt,
    },
  });

  return process;
}

/**
 * Start a process execution. Updates status and records the run.
 */
export async function startProcess(processId: string): Promise<void> {
  const process = await db.process.findUniqueOrThrow({
    where: { id: processId },
  });

  if (process.status === "RUNNING") {
    throw new Error(`Process ${processId} is already running`);
  }

  const nextRunAt = process.frequency ? computeNextRun(process.frequency) : null;

  await db.process.update({
    where: { id: processId },
    data: {
      status: "RUNNING",
      lastRunAt: new Date(),
      nextRunAt,
      runCount: { increment: 1 },
    },
  });
}

/**
 * Pause a running process.
 */
export async function pauseProcess(processId: string): Promise<void> {
  const process = await db.process.findUniqueOrThrow({
    where: { id: processId },
  });

  if (process.status !== "RUNNING") {
    throw new Error(`Process ${processId} is not running (status: ${process.status})`);
  }

  await db.process.update({
    where: { id: processId },
    data: { status: "PAUSED" },
  });
}

/**
 * Stop a process.
 */
export async function stopProcess(processId: string): Promise<void> {
  await db.process.update({
    where: { id: processId },
    data: {
      status: "STOPPED",
      nextRunAt: null,
    },
  });
}

/**
 * Return all active processes with next run times.
 */
export async function getSchedule(): Promise<ScheduleEntry[]> {
  const processes = await db.process.findMany({
    where: {
      status: { in: ["RUNNING", "PAUSED"] },
    },
    orderBy: [
      { priority: "asc" },
      { nextRunAt: "asc" },
    ],
  });

  return processes.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    status: p.status,
    priority: p.priority,
    frequency: p.frequency,
    lastRunAt: p.lastRunAt,
    nextRunAt: p.nextRunAt,
    runCount: p.runCount,
    assigneeId: p.assigneeId,
  }));
}

/**
 * Detect if too many processes overlap or cause resource contention.
 */
export async function checkContention(strategyId?: string): Promise<ContentionReport> {
  const whereClause = strategyId
    ? { strategyId, status: "RUNNING" as ProcessStatus }
    : { status: "RUNNING" as ProcessStatus };

  const running = await db.process.findMany({
    where: whereClause,
    orderBy: { priority: "asc" },
  });

  const missionWhere = strategyId
    ? { strategyId, status: "DRAFT" }
    : { status: "DRAFT" };

  const pendingMissions = await db.mission.count({ where: missionWhere });

  const bottlenecks: string[] = [];
  const overlapWindows: ContentionReport["overlapWindows"] = [];

  // Check total running count
  if (running.length > 5) {
    bottlenecks.push(`Too many concurrent processes (${running.length} running)`);
  }

  if (pendingMissions > 10) {
    bottlenecks.push(`Mission backlog growing (${pendingMissions} pending)`);
  }

  // Group by priority to detect priority inversion
  const concurrentByPriority: Record<string, number> = {};
  for (const proc of running) {
    const key = `P${proc.priority}`;
    concurrentByPriority[key] = (concurrentByPriority[key] ?? 0) + 1;
  }

  // Detect same-driver overlap (two processes targeting the same driver)
  const driverGroups = new Map<string, string[]>();
  for (const proc of running) {
    if (proc.driverId) {
      const group = driverGroups.get(proc.driverId) ?? [];
      group.push(proc.id);
      driverGroups.set(proc.driverId, group);
    }
  }

  for (const [driverId, processIds] of driverGroups.entries()) {
    if (processIds.length > 1) {
      bottlenecks.push(`Driver ${driverId} has ${processIds.length} concurrent processes`);
      overlapWindows.push({
        processIds,
        reason: `Multiple processes targeting the same driver`,
      });
    }
  }

  // Detect same-assignee overlap (one person running too many processes)
  const assigneeGroups = new Map<string, string[]>();
  for (const proc of running) {
    if (proc.assigneeId) {
      const group = assigneeGroups.get(proc.assigneeId) ?? [];
      group.push(proc.id);
      assigneeGroups.set(proc.assigneeId, group);
    }
  }

  for (const [assigneeId, processIds] of assigneeGroups.entries()) {
    if (processIds.length > 3) {
      bottlenecks.push(`Assignee ${assigneeId} is running ${processIds.length} processes simultaneously`);
      overlapWindows.push({
        processIds,
        reason: `Single assignee overloaded`,
      });
    }
  }

  // High-priority starvation check
  const highPriority = running.filter((p) => p.priority <= 2);
  const lowPriority = running.filter((p) => p.priority >= 8);
  if (lowPriority.length > highPriority.length * 2 && highPriority.length > 0) {
    bottlenecks.push("Priority inversion detected: too many low-priority processes may starve high-priority ones");
  }

  return {
    runningProcesses: running.length,
    pendingMissions,
    bottlenecks,
    concurrentByPriority,
    overlapWindows,
  };
}

/**
 * Get contention for a specific strategy (backward-compatible export).
 */
export async function getContention(strategyId: string) {
  const report = await checkContention(strategyId);
  return {
    runningProcesses: report.runningProcesses,
    pendingMissions: report.pendingMissions,
    bottlenecks: report.bottlenecks,
  };
}

// --- Helpers ---

/**
 * Compute the next run time based on a cron-like frequency string.
 * Supports: "hourly", "daily", "weekly", "monthly", or interval like "every 30m", "every 6h".
 */
function computeNextRun(frequency: string): Date {
  const now = new Date();

  const intervalMatch = frequency.match(/^every\s+(\d+)\s*(m|h|d)$/i);
  if (intervalMatch) {
    const amount = parseInt(intervalMatch[1]!, 10);
    const unit = intervalMatch[2]!.toLowerCase();
    const ms =
      unit === "m" ? amount * 60 * 1000 :
      unit === "h" ? amount * 60 * 60 * 1000 :
      amount * 24 * 60 * 60 * 1000;
    return new Date(now.getTime() + ms);
  }

  switch (frequency.toLowerCase()) {
    case "hourly":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "daily":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "monthly":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    default:
      // Default to daily if unrecognized
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
