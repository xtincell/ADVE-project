import { db } from "@/lib/db";
import { captureEvent } from "@/server/services/knowledge-capture";
import * as teamAllocator from "@/server/services/team-allocator";

export interface SlaAlert {
  missionId: string;
  missionTitle: string;
  driverId: string | null;
  deadline: Date;
  hoursRemaining: number;
  severity: "warning" | "urgent" | "breached";
}

export interface SlaMetrics {
  operatorId: string;
  totalMissions: number;
  completedOnTime: number;
  completedLate: number;
  inProgress: number;
  overdue: number;
  onTimePercent: number;
  avgDelayHours: number;
  medianDelayHours: number;
  worstDelayHours: number;
}

/**
 * Check if a specific mission is within SLA deadlines.
 */
export async function checkSla(missionId: string): Promise<{
  withinSla: boolean;
  alert: SlaAlert | null;
  deadline: Date | null;
  hoursRemaining: number | null;
}> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
  });

  const meta = mission.advertis_vector as Record<string, unknown> | null;
  const deadlineStr = meta?.deadline as string | undefined;

  if (!deadlineStr) {
    return { withinSla: true, alert: null, deadline: null, hoursRemaining: null };
  }

  const deadline = new Date(deadlineStr);
  const now = new Date();
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Mission is completed — check if it was on time
  if (mission.status === "COMPLETED" || mission.status === "DELIVERED") {
    const completedAt = mission.updatedAt;
    const wasOnTime = completedAt <= deadline;
    return {
      withinSla: wasOnTime,
      alert: null,
      deadline,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    };
  }

  let severity: SlaAlert["severity"] | null = null;
  if (hoursRemaining < 0) severity = "breached";
  else if (hoursRemaining < 24) severity = "urgent";
  else if (hoursRemaining < 48) severity = "warning";

  const alert: SlaAlert | null = severity
    ? {
        missionId: mission.id,
        missionTitle: mission.title,
        driverId: mission.driverId,
        deadline,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        severity,
      }
    : null;

  return {
    withinSla: hoursRemaining >= 0,
    alert,
    deadline,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
  };
}

/**
 * List all missions past their deadline.
 */
export async function getOverdueMissions(): Promise<SlaAlert[]> {
  const now = new Date();
  const missions = await db.mission.findMany({
    where: {
      status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] },
    },
  });

  const overdue: SlaAlert[] = [];

  for (const mission of missions) {
    const meta = mission.advertis_vector as Record<string, unknown> | null;
    const deadlineStr = meta?.deadline as string | undefined;
    if (!deadlineStr) continue;

    const deadline = new Date(deadlineStr);
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) {
      overdue.push({
        missionId: mission.id,
        missionTitle: mission.title,
        driverId: mission.driverId,
        deadline,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        severity: "breached",
      });
    }
  }

  // Sort by most overdue first
  return overdue.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}

/**
 * Aggregate SLA stats for a specific operator: on-time %, avg delay, etc.
 */
export async function calculateSlaMetrics(operatorId: string): Promise<SlaMetrics> {
  const now = new Date();

  // Get all missions belonging to strategies of this operator
  const missions = await db.mission.findMany({
    where: {
      strategy: { operatorId },
    },
    include: { strategy: true },
  });

  let completedOnTime = 0;
  let completedLate = 0;
  let inProgress = 0;
  let overdue = 0;
  const delays: number[] = [];

  for (const mission of missions) {
    const meta = mission.advertis_vector as Record<string, unknown> | null;
    const deadlineStr = meta?.deadline as string | undefined;

    if (!deadlineStr) {
      // Missions without deadlines are not counted toward SLA
      if (["IN_PROGRESS", "REVIEW", "DRAFT"].includes(mission.status)) {
        inProgress++;
      }
      continue;
    }

    const deadline = new Date(deadlineStr);

    if (mission.status === "COMPLETED" || mission.status === "DELIVERED") {
      const completedAt = mission.updatedAt;
      const delayHours = (completedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60);

      if (delayHours <= 0) {
        completedOnTime++;
        delays.push(0);
      } else {
        completedLate++;
        delays.push(delayHours);
      }
    } else if (["IN_PROGRESS", "REVIEW", "DRAFT"].includes(mission.status)) {
      const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursRemaining < 0) {
        overdue++;
        delays.push(Math.abs(hoursRemaining));
      } else {
        inProgress++;
      }
    }
  }

  const totalCompleted = completedOnTime + completedLate;
  const onTimePercent = totalCompleted > 0
    ? Math.round((completedOnTime / totalCompleted) * 10000) / 100
    : 100;

  const avgDelayHours = delays.length > 0
    ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10
    : 0;

  const sortedDelays = [...delays].sort((a, b) => a - b);
  const medianDelayHours = sortedDelays.length > 0
    ? Math.round(sortedDelays[Math.floor(sortedDelays.length / 2)]! * 10) / 10
    : 0;

  const worstDelayHours = sortedDelays.length > 0
    ? Math.round(sortedDelays[sortedDelays.length - 1]! * 10) / 10
    : 0;

  return {
    operatorId,
    totalMissions: missions.length,
    completedOnTime,
    completedLate,
    inProgress,
    overdue,
    onTimePercent,
    avgDelayHours,
    medianDelayHours,
    worstDelayHours,
  };
}

/**
 * Create an alert for an overdue or at-risk mission.
 * Logs the alert to the knowledge base and returns the alert details.
 */
export async function sendAlert(missionId: string): Promise<SlaAlert | null> {
  const slaCheck = await checkSla(missionId);

  if (!slaCheck.alert) {
    return null; // No alert needed
  }

  const alert = slaCheck.alert;

  // Log alert to knowledge base
  await captureEvent("MISSION_OUTCOME", {
    data: {
      type: "sla_alert",
      missionId: alert.missionId,
      missionTitle: alert.missionTitle,
      severity: alert.severity,
      hoursRemaining: alert.hoursRemaining,
      deadline: alert.deadline.toISOString(),
      alertedAt: new Date().toISOString(),
    },
    sourceId: missionId,
  });

  // Update mission metadata to record that an alert was sent
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
  });
  const existingMeta = (mission.advertis_vector as Record<string, unknown>) ?? {};

  const alertHistory = Array.isArray(existingMeta.slaAlerts) ? existingMeta.slaAlerts : [];
  alertHistory.push({
    severity: alert.severity,
    sentAt: new Date().toISOString(),
    hoursRemaining: alert.hoursRemaining,
  });

  await db.mission.update({
    where: { id: missionId },
    data: {
      advertis_vector: {
        ...existingMeta,
        slaAlerts: alertHistory,
        lastAlertAt: new Date().toISOString(),
      },
    },
  });

  return alert;
}

/**
 * Check all active missions for SLA deadlines approaching or breached.
 */
export async function checkSlaDeadlines(): Promise<SlaAlert[]> {
  const now = new Date();
  const missions = await db.mission.findMany({
    where: { status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] } },
    include: { driver: true },
  });

  const alerts: SlaAlert[] = [];

  for (const mission of missions) {
    const meta = mission.advertis_vector as Record<string, unknown> | null;
    const deadlineStr = meta?.deadline as string | undefined;
    if (!deadlineStr) continue;

    const deadline = new Date(deadlineStr);
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    let severity: SlaAlert["severity"] | null = null;
    if (hoursRemaining < 0) severity = "breached";
    else if (hoursRemaining < 24) severity = "urgent";
    else if (hoursRemaining < 48) severity = "warning";

    if (severity) {
      alerts.push({
        missionId: mission.id,
        missionTitle: mission.title,
        driverId: mission.driverId,
        deadline,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        severity,
      });

      // When a mission is past its deadline (breached), create an SLA_VIOLATION
      // signal with a reassignment suggestion so the operator can act on it.
      if (severity === "breached") {
        const overdueDays = Math.abs(Math.round(hoursRemaining / 24 * 10) / 10);

        // Get a reassignment suggestion from team-allocator (non-blocking)
        let suggestion: Awaited<ReturnType<typeof teamAllocator.suggestAllocation>> | null = null;
        try {
          suggestion = await teamAllocator.suggestAllocation(mission.id);
        } catch {
          // If allocation suggestion fails, we still create the signal without it
        }

        await db.signal.create({
          data: {
            strategyId: mission.strategyId,
            type: "SLA_VIOLATION",
            data: {
              missionId: mission.id,
              missionTitle: mission.title,
              overdueDays,
              assigneeId: mission.assigneeId ?? mission.driverId,
              suggestion: suggestion
                ? {
                    suggestedCreators: suggestion.suggestedCreators,
                  }
                : null,
            },
          },
        });
      }
    }
  }

  return alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}

/**
 * Set a deadline on a mission for SLA tracking.
 */
export async function setDeadline(missionId: string, deadline: Date): Promise<void> {
  const mission = await db.mission.findUniqueOrThrow({ where: { id: missionId } });
  const existing = (mission.advertis_vector as Record<string, unknown>) ?? {};
  await db.mission.update({
    where: { id: missionId },
    data: {
      advertis_vector: {
        ...existing,
        deadline: deadline.toISOString(),
      },
    },
  });
}

/**
 * Get SLA status for a specific mission (backward-compatible).
 */
export async function getMissionSla(missionId: string): Promise<SlaAlert | null> {
  const alerts = await checkSlaDeadlines();
  return alerts.find((a) => a.missionId === missionId) ?? null;
}
