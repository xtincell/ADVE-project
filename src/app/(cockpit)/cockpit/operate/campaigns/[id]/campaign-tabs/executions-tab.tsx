"use client";

import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@/components/shared/status-badge";
import { Section, MiniBtn, EmptyMsg } from "./shared";
import { Layers } from "lucide-react";

export function ExecutionsTab({ campaignId }: { campaignId: string }) {
  const execQuery = trpc.campaignManager.listExecutions.useQuery({ campaignId });
  const transitionMut = trpc.campaignManager.transitionExecution.useMutation({
    onSuccess: () => execQuery.refetch(),
  });

  const executions = (execQuery.data ?? []) as Array<Record<string, unknown>>;

  const EXEC_STATES = ["PLANNED", "IN_PRODUCTION", "IN_REVIEW", "APPROVED", "DELIVERED", "CANCELLED"];

  return (
    <Section title={`Executions (${executions.length})`} icon={Layers}>
      {execQuery.isLoading ? <EmptyMsg text="Chargement..." /> : executions.length === 0 ? (
        <EmptyMsg text="Aucune execution en cours. Les executions sont creees depuis les actions." />
      ) : (
        <div className="space-y-3">
          {executions.map((ex) => {
            const currentIdx = EXEC_STATES.indexOf(ex.state as string);
            const nextState = currentIdx >= 0 && currentIdx < EXEC_STATES.length - 2 ? EXEC_STATES[currentIdx + 1] : null;

            return (
              <div key={ex.id as string} className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">{(ex.label as string) ?? `Execution ${(ex.id as string).slice(0, 8)}`}</h4>
                    <p className="mt-0.5 text-xs text-foreground-muted">Action: {(ex.actionId as string)?.slice(0, 8)}...</p>
                    {!!ex.deliverableUrl && <p className="mt-1 text-xs text-info">{ex.deliverableUrl as string}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ex.state as string} />
                    {nextState && (
                      <MiniBtn
                        onClick={() => transitionMut.mutate({ id: ex.id as string, toState: nextState as any })}
                        disabled={transitionMut.isPending}
                      >
                        → {nextState.replace(/_/g, " ")}
                      </MiniBtn>
                    )}
                  </div>
                </div>
                {/* Progress bar based on state index */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-background">
                  <div
                    className="h-1.5 rounded-full bg-success transition-all"
                    style={{ width: `${Math.max(10, ((currentIdx + 1) / (EXEC_STATES.length - 1)) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
