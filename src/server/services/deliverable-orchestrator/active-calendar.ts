import type { Prisma } from "@prisma/client";
import { ACTIVE_CALENDAR_TOOL, isOperationalCalendar } from "@/domain/calendar-editions";

const calendarProjection = {
  id: true, updatedAt: true, createdAt: true, toolSlug: true, output: true,
  execution: { select: { sequenceKey: true } },
} as const;

/** A playbook may quote or propose a calendar; writing its section cannot replace the planner's edition. */
export async function readActiveCalendar(strategyId: string, client: Prisma.TransactionClient) {
  let cursor: string | undefined;
  for (;;) {
    const rows = await client.gloryOutput.findMany({
      where: { strategyId, toolSlug: ACTIVE_CALENDAR_TOOL },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: calendarProjection,
    });
    const selected = rows.find(isOperationalCalendar);
    if (selected || rows.length < 8) return selected ?? null;
    cursor = rows[rows.length-1]!.id;
  }
}
