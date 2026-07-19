"use client";

/**
 * Cockpit — Relevé de valeur mensuel (Phase A état-final, B4). Le reçu qui
 * manquait : ce qui a été mesuré, ce qui a bougé, ce que ça a coûté — par
 * mois, depuis les séries réellement persistées. Chaque « non mesuré » est
 * dit, jamais masqué.
 */

import { useState } from "react";
import { Receipt } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Text, Badge } from "@/components/primitives";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function monthOptions(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function DeltaRow({ label, s, unit }: { label: string; s: { measured: boolean; start: number | null; end: number | null; delta: number | null; note?: string }; unit?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b py-3 last:border-0" style={{ borderColor: "var(--color-border)" }}>
      <Text className="text-sm font-medium">{label}</Text>
      {s.measured ? (
        <span className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-foreground-secondary">
            {s.start !== null ? fmt(s.start) : "—"}{unit} → {s.end !== null ? fmt(s.end) : "—"}{unit}
          </span>
          {s.delta !== null ? (
            <span className={`font-mono text-sm font-semibold ${s.delta >= 0 ? "text-[color:var(--color-success,inherit)]" : ""}`}>
              {s.delta >= 0 ? "+" : ""}{fmt(s.delta)}{unit}
            </span>
          ) : (
            <span className="text-xs text-foreground-muted">{s.note}</span>
          )}
        </span>
      ) : (
        <span className="text-xs text-foreground-muted">{s.note ?? "non mesuré"}</span>
      )}
    </div>
  );
}

export default function RelevePage() {
  const strategyId = useCurrentStrategyId();
  const [month, setMonth] = useState<string | undefined>(undefined);
  const releve = trpc.cockpitDashboard.getValueStatement.useQuery(
    { strategyId: strategyId ?? "", month },
    { enabled: !!strategyId },
  );
  const r = releve.data;

  return (
    <section className="@container space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Receipt className="h-5 w-5 text-accent" aria-hidden />
            Relevé de valeur
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-foreground-secondary">
            Mois par mois : ce qui a été mesuré sur votre marque, ce qui a bougé, ce que la
            production a coûté. Uniquement des données réelles — chaque absence est dite.
          </p>
        </div>
        <select
          value={month ?? ""}
          onChange={(e) => setMonth(e.target.value || undefined)}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
          aria-label="Choisir le mois"
        >
          <option value="">Mois courant (par défaut)</option>
          {monthOptions().map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </header>

      {releve.isLoading ? <Card><CardBody><Text className="text-sm text-foreground-secondary">Composition du relevé…</Text></CardBody></Card> : null}
      {releve.error ? <Card><CardBody><Badge tone="error">{releve.error.message}</Badge></CardBody></Card> : null}

      {r ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{r.brandName} — {r.monthLabel}</CardTitle>
              <CardDescription>Ce qui a bougé sur la période.</CardDescription>
            </CardHeader>
            <CardBody>
              <DeltaRow label="Audience totale (réseaux connectés)" s={r.audience} />
              <DeltaRow label="Santé communauté (engagement moyen)" s={r.communityHealth} unit=" ‰" />
              <DeltaRow label="Score d'empreinte publique (/100)" s={r.footprintScore} />
            </CardBody>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { v: fmt(r.publicationsCount), l: "publications parties" },
              { v: fmt(r.actionsDoneCount), l: "actions terminées" },
              { v: r.costUsd !== null ? `$${r.costUsd}` : "—", l: "coût de production enregistré" },
              { v: r.forceVerdict ? `${r.forceVerdict.force}/200` : "—", l: r.forceVerdict ? `force (${r.forceVerdict.tier})` : "force — pas encore mesurée" },
            ].map((t) => (
              <div key={t.l} className="flex flex-col gap-0.5 rounded-lg border px-3 py-4 text-center" style={{ borderColor: "var(--color-border)" }}>
                <span className="font-mono text-xl font-semibold text-foreground">{t.v}</span>
                <span className="text-xs text-foreground-muted">{t.l}</span>
              </div>
            ))}
          </div>

          <Text className="text-xs text-foreground-muted">
            Les séries « non mesurées » s&apos;activent en connectant vos réseaux (Réglages → Connexions)
            et en planifiant vos actions au calendrier — le relevé se remplit alors tout seul, chaque mois.
          </Text>
        </>
      ) : null}
    </section>
  );
}
