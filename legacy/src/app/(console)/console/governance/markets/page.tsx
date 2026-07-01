"use client";

/**
 * Console Gouvernance — Market kill-switch (ADR-0105).
 * Seule surface qui voit les marchés neutralisés (ADMIN bypasse le filtre).
 * Neutraliser (geler / shadowban) · Réintégrer · Purger (anti-foot-gun).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Snowflake, EyeOff, RotateCcw, Trash2 } from "lucide-react";

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success",
  FROZEN: "bg-warning/15 text-warning",
  SHADOWBANNED: "bg-error/15 text-error",
  PURGED: "bg-bg-subtle text-foreground-muted",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  FROZEN: "Gelé",
  SHADOWBANNED: "Shadowbanné",
  PURGED: "Purgé",
};

export default function MarketsKillSwitchPage() {
  const utils = trpc.useUtils();
  const [reason, setReason] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Record<string, string>>({});

  const { data, isLoading } = trpc.markets.list.useQuery();

  const invalidate = () => utils.markets.list.invalidate();
  const neutralize = trpc.markets.neutralize.useMutation({ onSuccess: invalidate });
  const reinstate = trpc.markets.reinstate.useMutation({ onSuccess: invalidate });
  const purge = trpc.markets.purge.useMutation({ onSuccess: invalidate });

  const busy = neutralize.isPending || reinstate.isPending || purge.isPending;

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marchés — kill-switch"
        description="Neutraliser un marché (geler = visible lecture seule ; shadowban = invisible pour tous sauf cette console), le réintégrer sans perte, ou le purger définitivement. Cf. ADR-0105."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Gouvernance", href: "/console/governance" },
          { label: "Marchés" },
        ]}
      />

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {(data ?? []).map((m) => {
          const reasonVal = reason[m.code] ?? "";
          const confirmVal = confirm[m.code] ?? "";
          return (
            <div key={m.code} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-foreground-muted">{m.code}</span>
                  <span className="text-sm font-medium text-foreground">{m.name}</span>
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${STATUS_TONE[m.status] ?? "bg-bg-subtle text-foreground-muted"}`}>
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                </div>
                <p className="text-xs text-foreground-muted">
                  {m.strategyCount} stratégie(s)
                  {m.statusReason ? ` · ${m.statusReason}` : ""}
                  {m.statusChangedAt ? ` · maj ${new Date(m.statusChangedAt).toLocaleDateString("fr-FR")}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {m.status === "ACTIVE" && (
                  <>
                    <input
                      placeholder="Motif (optionnel)"
                      value={reasonVal}
                      onChange={(e) => setReason({ ...reason, [m.code]: e.target.value })}
                      className="w-40 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => neutralize.mutate({ countryCode: m.code, mode: "FREEZE", reason: reasonVal || undefined })}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-lg bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning hover:opacity-90 disabled:opacity-40"
                    >
                      <Snowflake className="h-3 w-3" /> Geler
                    </button>
                    <button
                      onClick={() => neutralize.mutate({ countryCode: m.code, mode: "SHADOWBAN", reason: reasonVal || undefined })}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-lg bg-error/15 px-3 py-1.5 text-xs font-medium text-error hover:opacity-90 disabled:opacity-40"
                    >
                      <EyeOff className="h-3 w-3" /> Shadowban
                    </button>
                  </>
                )}

                {(m.status === "FROZEN" || m.status === "SHADOWBANNED") && (
                  <button
                    onClick={() => reinstate.mutate({ countryCode: m.code })}
                    disabled={busy}
                    className="flex items-center gap-1 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-medium text-success hover:opacity-90 disabled:opacity-40"
                  >
                    <RotateCcw className="h-3 w-3" /> Réintégrer
                  </button>
                )}

                {m.status === "SHADOWBANNED" && (
                  <>
                    <input
                      placeholder={`Tapez ${m.code}`}
                      value={confirmVal}
                      onChange={(e) => setConfirm({ ...confirm, [m.code]: e.target.value })}
                      className="w-24 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => purge.mutate({ countryCode: m.code, confirmCode: confirmVal })}
                      disabled={busy || confirmVal !== m.code}
                      className="flex items-center gap-1 rounded-lg border border-error bg-error/10 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/20 disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" /> Purger
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {(data ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-foreground-muted">Aucun marché.</div>
        )}
      </div>

      {(neutralize.error || reinstate.error || purge.error) && (
        <p className="text-xs text-error">
          {neutralize.error?.message ?? reinstate.error?.message ?? purge.error?.message}
        </p>
      )}
    </div>
  );
}
