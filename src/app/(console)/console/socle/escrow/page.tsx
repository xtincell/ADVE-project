"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/primitives/button";
import { Lock, DollarSign, Clock, CheckCircle, ShieldCheck, AlertTriangle } from "lucide-react";

type EscrowStatus = "HELD" | "RELEASED" | "DISPUTED" | "REFUNDED";

/**
 * Interface d'arbitrage du séquestre Guilde (ADR-0116) — réservée aux agents
 * UPgraders. Lit le modèle Escrow réel (conditions + mission) et expose les
 * actions gouvernées : valider une condition, libérer (→ payout momo), rejeter
 * (rembourser), mettre en litige. Le paiement reste asynchrone à validation manuelle.
 */
export default function EscrowPage() {
  const [activeTab, setActiveTab] = useState<EscrowStatus | "all">("all");
  const utils = trpc.useUtils();
  const { data: escrows, isLoading } = trpc.escrowArbitration.list.useQuery({});

  const invalidate = () => utils.escrowArbitration.list.invalidate();
  const release = trpc.escrowArbitration.release.useMutation({ onSuccess: invalidate });
  const refund = trpc.escrowArbitration.refund.useMutation({ onSuccess: invalidate });
  const dispute = trpc.escrowArbitration.dispute.useMutation({ onSuccess: invalidate });
  const meetCondition = trpc.escrowArbitration.meetCondition.useMutation({ onSuccess: invalidate });

  if (isLoading) return <SkeletonPage />;

  const items = escrows ?? [];
  const held = items.filter((e) => e.status === "HELD");
  const released = items.filter((e) => e.status === "RELEASED");
  const disputed = items.filter((e) => e.status === "DISPUTED");
  const refunded = items.filter((e) => e.status === "REFUNDED");

  const totalHeld = held.reduce((s, e) => s + e.amount, 0);
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  const filtered =
    activeTab === "HELD" ? held
    : activeTab === "RELEASED" ? released
    : activeTab === "DISPUTED" ? disputed
    : activeTab === "REFUNDED" ? refunded
    : items;

  const tabs = [
    { key: "all", label: "Tous", count: items.length },
    { key: "HELD", label: "En séquestre", count: held.length },
    { key: "DISPUTED", label: "En litige", count: disputed.length },
    { key: "RELEASED", label: "Libérés", count: released.length },
    { key: "REFUNDED", label: "Remboursés", count: refunded.length },
  ];

  const busy = release.isPending || refund.isPending || dispute.isPending || meetCondition.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Arbitrage du séquestre"
        description="Validation manuelle des paiements Guilde par les agents UPgraders. Les fonds sont libérés vers le talent (mobile money) ou remboursés à la marque."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Socle" },
          { label: "Escrow" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total séquestres" value={items.length} icon={Lock} />
        <StatCard title="Montant sous séquestre" value={`${fmt(totalHeld)} XAF`} icon={DollarSign} />
        <StatCard title="À arbitrer" value={held.length + disputed.length} icon={Clock} />
        <StatCard title="Libérés" value={released.length} icon={CheckCircle} />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={(k) => setActiveTab(k as EscrowStatus | "all")} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Aucun séquestre"
          description="Les fonds en séquestre apparaîtront ici. Les paiements sont sécurisés jusqu'à validation manuelle par un arbitre."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const allMet = e.conditions.every((c) => c.met);
            const canArbitrate = e.status === "HELD" || e.status === "DISPUTED";
            return (
              <div key={e.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {e.mission?.title ?? (e.missionId ? `Mission ${e.missionId.slice(0, 8)}…` : "Séquestre")}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      Mis en séquestre le {new Date(e.heldAt).toLocaleDateString("fr-FR")}
                      {e.arbitratedBy ? " · arbitré" : ""}
                    </p>
                    {e.reason ? <p className="mt-1 text-xs text-foreground-muted">Motif : {e.reason}</p> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{fmt(e.amount)} {e.currency}</span>
                    <StatusBadge status={e.status} />
                  </div>
                </div>

                {e.conditions.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {e.conditions.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className={c.met ? "text-foreground-muted line-through" : "text-foreground"}>{c.condition}</span>
                        {c.met ? (
                          <span className="inline-flex items-center gap-1 text-foreground-muted">
                            <CheckCircle className="h-3.5 w-3.5" /> validée
                          </span>
                        ) : (
                          canArbitrate && (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => meetCondition.mutate({ conditionId: c.id })}>
                              Valider
                            </Button>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {canArbitrate && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busy}
                      onClick={() => {
                        const force = !allMet;
                        const reason = force
                          ? window.prompt("Conditions non toutes remplies — justification pour libérer malgré tout :") ?? undefined
                          : undefined;
                        if (force && !reason) return;
                        release.mutate({ escrowId: e.id, force, reason });
                      }}
                    >
                      Libérer les fonds
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => {
                        const reason = window.prompt("Motif du remboursement à la marque :");
                        if (reason) refund.mutate({ escrowId: e.id, reason });
                      }}
                    >
                      Rejeter / Rembourser
                    </Button>
                    {e.status !== "DISPUTED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt("Motif de la mise en litige :");
                          if (reason) dispute.mutate({ escrowId: e.id, reason });
                        }}
                      >
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Litige
                      </Button>
                    )}
                  </div>
                )}

                {e.status === "RELEASED" && e.paymentOrderId && (
                  <p className="mt-3 text-xs text-foreground-muted">
                    Payout émis (mobile money) — ordre {e.paymentOrderId.slice(0, 8)}…, en attente de traitement provider.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
