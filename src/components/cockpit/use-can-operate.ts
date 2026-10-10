"use client";

import { trpc } from "@/lib/trpc/client";

/**
 * True when the current user may perform operator-only actions — role ADMIN or
 * linked to an Operator. Mirrors `operatorProcedure` (server `trpc/init.ts`) via
 * the additive `auth.me.canOperate` field.
 *
 * Lets cockpit surfaces render operator-only controls honestly — enabled only
 * when actually usable — instead of showing them to founders and failing on
 * click with FORBIDDEN. Founders (non-operators) get a read-only experience;
 * UPgraders operates the OS on their behalf (governance unchanged server-side).
 */
export function useCanOperate(): boolean {
  return trpc.auth.me.useQuery().data?.canOperate ?? false;
}

/** Visible permissions use the current brand's existing server verdict. */
export function useBrandWriteAccess(strategyId: string | null) {
  const canOperate = useCanOperate();
  const access = trpc.strategy.getMyAccess.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );
  const ready = !!strategyId && !access.isLoading && !access.isFetching && !access.isError;
  const zones = ready ? access.data?.writeZones ?? [] : [];
  const canWriteStrategy = zones.includes("*");
  const canWriteCalendar = canWriteStrategy || zones.includes("calendar");
  return {
    canWriteStrategy,
    canWriteCalendar,
    canOperateOnBrand: canOperate && canWriteStrategy,
    canSyncActions: canOperate && canWriteCalendar,
  };
}
