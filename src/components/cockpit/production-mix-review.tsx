"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { mixDecision, modeLabels, type ProductionMode, productionModes } from "@/domain/production-mix";
import type { RouterOutputs } from "@/lib/trpc/client";

export function ProductionMixReview({ strategyId, onAdopted }: { strategyId: string; onAdopted: () => void }) {
  const review = trpc.strategy.productionMix.useQuery({ id: strategyId });
  if (review.isError) {
    return (
      <p role="alert">
        Le mode stratégique ne peut pas être relu.{" "}
        <button
          type="button"
          onClick={() => void review.refetch()}
        >
          Réessayer
        </button>
      </p>
    );
  }
  if (!review.data) return null;
  return (
    <MixForm
      key={strategyId + review.data.fingerprint}
      strategyId={strategyId}
      data={review.data}
      reload={() => void review.refetch()}
      onAdopted={onAdopted}
    />
  );
}

function MixForm(
  { strategyId, data, reload, onAdopted }: {
    strategyId: string;
    data: RouterOutputs["strategy"]["productionMix"];
    reload: () => void;
    onAdopted: () => void;
  },
) {
  const [open, setOpen] = useState(!data.previous.primary),
    [primary, setPrimary] = useState<ProductionMode | "">(data.primary ?? ""),
    [percent, setPercent] = useState(data.percent),
    [reason, setReason] = useState(data.reason);
  const utils = trpc.useUtils();
  const mutation = trpc.strategy.update.useMutation({
    onSuccess: async () => {
      await utils.strategy.productionMix.invalidate({ id: strategyId });
      await utils.strategy.get.invalidate({ id: strategyId });
      onAdopted();
    },
  });
  const input = { primary, percent, reason, expected: data.fingerprint, confirm: true as const };
  const checked = mixDecision.safeParse(input);
  const sum = productionModes.reduce((n, m) => n + percent[m], 0);
  return (
    <section id="forge-mix-strategique" className="scroll-mt-6 space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Mode stratégique de {data.name}</h3>
          <p className="text-sm">
            {data.previous.version
              ? `Décision relue · v${data.previous.version} · ${modeLabels[data.previous.primary!]} · ${
                data.previous.actor ?? "auteur enregistré"
              }${data.previous.at ? " · " + new Date(data.previous.at).toLocaleDateString("fr-FR") : ""}`
              : data.previous.primary
              ? "Mix historique, décision non attribuée dans ce registre."
              : "Une décision sur la façon de mobiliser votre public est nécessaire avant de produire."}
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-border px-3 py-2 text-sm"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "Replier" : "Relire le mix"}
        </button>
      </div>
      {open && (
        <div className="space-y-3">
          <p className="text-sm">
            {data.basis === "ADVE"
              ? "Ces poids sont une proposition déduite de l’ADVE. Relisez les passages et ajustez-la."
              : data.basis === "LEGACY"
              ? "Ces poids existent déjà dans le dossier. Leur présence ne vaut pas validation."
              : data.basis === "DECISION"
              ? "La dernière décision est affichée. La confirmer après modification crée une nouvelle version."
              : "Aucun passage ADVE ne départage les modes. Les quatre poids égaux sont un point de départ à arbitrer."}
          </p>
          {data.evidence.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm">Passages de l’ADVE ({data.evidence.length})</summary>
              <ul className="space-y-1 py-2 text-sm">
                {data.evidence.map((x) => (
                  <li key={x.field + x.mode}>
                    <strong>{x.field} · {modeLabels[x.mode]}</strong> — {x.excerpt}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <fieldset disabled={data.locked || mutation.isPending} className="space-y-3">
            <label className="block text-sm">
              Mode principal<select
                className="ml-2 rounded border border-border bg-background p-1"
                value={primary}
                onChange={(e) => setPrimary(e.target.value as ProductionMode | "")}
              >
                <option value="">Choisir le mode principal</option>
                {productionModes.map((m) => <option key={m} value={m}>{modeLabels[m]} · {m}</option>)}
              </select>
            </label>
            <div className="grid gap-2 sm:grid-cols-4">
              {productionModes.map((m) => (
                <label key={m} className="text-sm">
                  {modeLabels[m]} (%)<input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="block w-full rounded border border-border bg-background p-2"
                    value={percent[m]}
                    onChange={(e) =>
                      setPercent({ ...percent, [m]: e.target.value === "" ? 0 : e.target.valueAsNumber })}
                  />
                </label>
              ))}
            </div>
            <p className="text-xs">
              Total : {sum} / 100. Le mode principal doit avoir un des poids les plus élevés.
            </p>
            <label className="block text-sm">
              Motif de la décision<textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={600}
                className="mt-1 block w-full rounded border border-border bg-background p-2"
                placeholder="Pourquoi ce mix convient-il à cette marque ?"
              />
            </label>
            {mutation.error && (
              <p role="alert" className="text-warning">
                {mutation.error.message} <button type="button" onClick={reload}>Relire les données actuelles</button>
              </p>
            )}
            <button
              type="button"
              disabled={!checked.success || mutation.isPending || data.locked}
              className="rounded bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
              onClick={() => {
                if (checked.success) mutation.mutate({ id: strategyId, productionMix: checked.data });
              }}
            >
              {mutation.isPending ? "Enregistrement…" : "Valider ce mix pour la production"}
            </button>
          </fieldset>
          {data.locked && <p role="status">Le dossier est verrouillé.</p>}
        </div>
      )}
    </section>
  );
}
