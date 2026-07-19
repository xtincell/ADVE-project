"use client";

/**
 * Console — Valorisations certifiées (ADR-0160). Surface opérateur : déclarer
 * le CA (jamais estimé), composer le certificat, consulter/exporter (MD),
 * vérifier publiquement par hash (/certificat/[hash]).
 */

import { useState } from "react";
import { BadgeDollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { useToast } from "@/components/shared/notification-toast";

function downloadMd(name: string, content: unknown) {
  const v = content as {
    brandName: string; issuedAt: string; certificateHash: string;
    force: { theta: number; tier: string } | null;
    community: { superfans: number; active: number };
    trajectory: { audienceNow: number | null; footprintNow: number | null };
    monetary: { status: string; valueMin?: number; valueMax?: number; currency?: string; method?: string; reason?: string };
    provenance: string[];
  };
  const md = [
    `# Certificat de valorisation — ${v.brandName}`,
    ``,
    `Émis le ${v.issuedAt.slice(0, 10)} · **N° ${v.certificateHash}** (vérifiable sur /certificat/${v.certificateHash})`,
    ``,
    `## Force de marque`,
    v.force ? `θ ${v.force.theta}/200 — palier ${v.force.tier}` : `Pas encore mesurée sur épreuves.`,
    ``,
    `## Communauté`,
    `${v.community.superfans} fans suivis · ${v.community.active} actifs`,
    ``,
    `## Trajectoire`,
    `Audience : ${v.trajectory.audienceNow ?? "non mesurée"} · Empreinte publique : ${v.trajectory.footprintNow ?? "non mesurée"}/100`,
    ``,
    `## Estimation monétaire`,
    v.monetary.status === "RANGE"
      ? `${v.monetary.valueMin} – ${v.monetary.valueMax} ${v.monetary.currency}\n\nMéthode : ${v.monetary.method}`
      : `Non calculable — ${v.monetary.reason}`,
    ``,
    `## Provenance`,
    ...v.provenance.map((p) => `- ${p}`),
  ].join("\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ValorisationsPage() {
  const toast = useToast();
  const strategies = trpc.strategy.list.useQuery({});
  const [strategyId, setStrategyId] = useState("");
  const [revenue, setRevenue] = useState("");
  const certs = trpc.thot.valuation.list.useQuery({ strategyId }, { enabled: !!strategyId });
  const utils = trpc.useUtils();
  const compose = trpc.thot.valuation.compose.useMutation({
    onSuccess: async () => {
      toast.success("Certificat composé — hash vérifiable émis.");
      await utils.thot.valuation.list.invalidate({ strategyId });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <BadgeDollarSign className="h-5 w-5 text-accent" aria-hidden />
          Valorisations certifiées
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground-secondary">
          Le certificat certifie ce qui est mesuré. Le montant n&apos;existe que si le
          chiffre d&apos;affaires est déclaré ici — jamais estimé.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
        <select
          value={strategyId}
          onChange={(e) => setStrategyId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
          aria-label="Marque"
        >
          <option value="">Choisir une marque…</option>
          {(strategies.data ?? []).map((s: { id: string; name: string }) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          value={revenue}
          onChange={(e) => setRevenue(e.target.value)}
          placeholder="CA annuel déclaré (XAF, optionnel)"
          inputMode="numeric"
          className="w-64 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
        />
        <Button
          size="sm"
          loading={compose.isPending}
          disabled={!strategyId || compose.isPending}
          onClick={() =>
            compose.mutate({
              strategyId,
              declaredAnnualRevenue: revenue.trim() ? Number(revenue) : undefined,
              currency: "XAF",
            })
          }
        >
          Composer le certificat
        </Button>
      </div>

      {certs.data && certs.data.length > 0 ? (
        <ul className="space-y-2">
          {certs.data.map((c) => {
            const hash = (c.metadata as { certificateHash?: string } | null)?.certificateHash;
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-foreground-muted">
                    N° {hash ?? "—"} · {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                    {hash ? (
                      <>
                        {" · "}
                        <a href={`/certificat/${hash}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          vérification publique
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
                <Button size="sm" variant="subtle" onClick={() => downloadMd(c.name, c.content)}>
                  Exporter (MD)
                </Button>
              </li>
            );
          })}
        </ul>
      ) : strategyId ? (
        <p className="text-sm text-foreground-muted">Aucun certificat pour cette marque.</p>
      ) : null}
    </section>
  );
}
