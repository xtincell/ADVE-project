"use client";

/**
 * Console — NOTRE funnel de conversion (audit oubliés 2026-07-19, B4).
 * Le cordonnier se mesure enfin : intakes démarrés → complétés → payés,
 * top sources d'attribution, parrainages. Données déjà persistées, zéro
 * nouveau tracking. Les visites pré-intake ne sont pas instrumentées —
 * c'est dit, pas masqué.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Text } from "@/components/primitives";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export default function FunnelPage() {
  const [days, setDays] = useState(30);
  const funnel = trpc.referral.adminFunnel.useQuery({ days });
  const d = funnel.data;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notre funnel</h1>
          <p className="mt-1 max-w-2xl text-sm text-foreground-secondary">
            Diagnostics démarrés → complétés → payés, sur les données réellement persistées.
            Les visites avant l&apos;intake ne sont pas comptées (non instrumentées).
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n)}
              className={`rounded-md border px-3 py-1.5 text-sm ${days === n ? "font-semibold text-[color:var(--color-accent)]" : "text-foreground-secondary"}`}
              style={{ borderColor: days === n ? "var(--color-accent)" : "var(--color-border)" }}
            >
              {n} j
            </button>
          ))}
        </div>
      </header>

      {funnel.isLoading ? <Text className="text-sm text-foreground-secondary">Calcul…</Text> : null}

      {d ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { v: fmt(d.started), l: "diagnostics démarrés" },
              { v: fmt(d.completed), l: `complétés${d.completionRate !== null ? ` (${d.completionRate} %)` : ""}` },
              { v: fmt(d.converted), l: "convertis en marque" },
              { v: fmt(d.paid), l: `paiements${d.paidRate !== null ? ` (${d.paidRate} % des complétés)` : ""}` },
            ].map((t) => (
              <div key={t.l} className="flex flex-col gap-0.5 rounded-lg border px-3 py-4 text-center" style={{ borderColor: "var(--color-border)" }}>
                <span className="font-mono text-2xl font-semibold text-foreground">{t.v}</span>
                <span className="text-xs text-foreground-muted">{t.l}</span>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top sources</CardTitle>
              <CardDescription>Attribution capturée au démarrage de l&apos;intake (utm/source/ref).</CardDescription>
            </CardHeader>
            <CardBody>
              {d.topSources.length === 0 ? (
                <Text className="text-sm text-foreground-secondary">Aucun intake sur la fenêtre.</Text>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {d.topSources.map((s) => (
                    <div key={s.source} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{s.source}</span>
                      <span className="font-mono font-semibold">{fmt(s.count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parrainages (tous temps)</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-4 text-sm">
                {d.referrals.length === 0 ? (
                  <Text className="text-sm text-foreground-secondary">Aucun parrainage déclaré.</Text>
                ) : (
                  d.referrals.map((r) => (
                    <span key={r.status}>
                      <span className="font-mono font-semibold">{fmt(r.count)}</span>{" "}
                      <span className="text-foreground-muted">{r.status.toLowerCase()}</span>
                    </span>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </>
      ) : null}
    </section>
  );
}
