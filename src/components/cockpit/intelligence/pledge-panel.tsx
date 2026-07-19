"use client";

/**
 * <PledgePanel /> — déclaration + résolution des paris (ADR-0159).
 *
 * Surface OPÉRATEUR uniquement (séquençage « paris modestes d'abord » — le
 * jugement de crédibilité reste humain). Un pari PUBLIC exige l'attestation
 * règle Domino's (structurelle côté serveur, cochée ici en conscience).
 *
 * DS : tokens sémantiques, primitives Button, aucune couleur brute.
 */

import { useState } from "react";
import { Target } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { useToast } from "@/components/shared/notification-toast";

const SUBJECTS = [
  { value: "AUDIENCE_TOTAL", label: "Audience totale (auto-mesuré)" },
  { value: "COMMUNITY_HEALTH", label: "Santé communauté (auto-mesuré)" },
  { value: "FOOTPRINT_SCORE", label: "Empreinte publique /100 (auto-mesuré)" },
  { value: "BUSINESS", label: "Résultat business (résolution manuelle)" },
  { value: "CULTUREL", label: "Fait culturel/sectoriel (résolution manuelle)" },
];

export function PledgePanel({ strategyId }: { strategyId: string }) {
  const me = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const canOperate = me.data?.canOperate === true;
  const toast = useToast();
  const utils = trpc.useUtils();

  const list = trpc.prediction.listForStrategy.useQuery({ strategyId }, { enabled: canOperate && !!strategyId });
  const due = trpc.prediction.due.useQuery(undefined, { enabled: canOperate });

  const [form, setForm] = useState({
    statement: "",
    subjectType: "AUDIENCE_TOTAL",
    predictedValue: "",
    horizonDays: 30,
    confidence: 0.7,
    isPublic: false,
    dominosAttestation: false,
  });

  const declare = trpc.prediction.declare.useMutation({
    onSuccess: async () => {
      toast.success("Pari enregistré — il sera confronté au réel à l'échéance.");
      setForm((f) => ({ ...f, statement: "", predictedValue: "", isPublic: false, dominosAttestation: false }));
      await utils.prediction.listForStrategy.invalidate({ strategyId });
    },
    onError: (e) => toast.error(e.message),
  });

  const resolve = trpc.prediction.resolveManual.useMutation({
    onSuccess: async () => {
      toast.success("Pari tranché — le verdict est au registre.");
      await Promise.all([utils.prediction.due.invalidate(), utils.prediction.listForStrategy.invalidate({ strategyId })]);
    },
    onError: (e) => toast.error(e.message),
  });
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});

  if (!canOperate) return null;

  return (
    <div className="rounded-xl border border-border bg-background/60 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Target className="h-4 w-4 text-accent" aria-hidden />
        Déclarer un pari
      </h2>
      <p className="mb-4 text-xs text-foreground-secondary">
        Une prédiction datée, enregistrée avant l&apos;échéance, résolue contre le réel.
        Commencez modeste et tenez — la crédibilité se construit pari par pari, le
        spectaculaire vient après.
      </p>

      <div className="flex flex-col gap-3">
        <textarea
          value={form.statement}
          onChange={(e) => setForm((f) => ({ ...f, statement: e.target.value }))}
          placeholder="Ex : « D'ici le 30 septembre, notre audience cumulée dépasse 8 000 abonnés. » (20 caractères min)"
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={form.subjectType}
            onChange={(e) => setForm((f) => ({ ...f, subjectType: e.target.value }))}
            className="rounded-md border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
            aria-label="Sujet du pari"
          >
            {SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            value={form.predictedValue}
            onChange={(e) => setForm((f) => ({ ...f, predictedValue: e.target.value }))}
            placeholder="Valeur visée (si mesurable)"
            inputMode="numeric"
            className="w-44 rounded-md border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
          />
          <label className="flex items-center gap-1.5 text-xs text-foreground-secondary">
            Échéance
            <input
              type="number"
              min={7}
              max={365}
              value={form.horizonDays}
              onChange={(e) => setForm((f) => ({ ...f, horizonDays: Number(e.target.value) }))}
              className="w-16 rounded-md border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
            />
            jours
          </label>
          <label className="flex items-center gap-1.5 text-xs text-foreground-secondary">
            Confiance
            <input
              type="number"
              min={5}
              max={95}
              value={Math.round(form.confidence * 100)}
              onChange={(e) => setForm((f) => ({ ...f, confidence: Number(e.target.value) / 100 }))}
              className="w-16 rounded-md border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
            />
            %
          </label>
        </div>
        <label className="flex items-start gap-2 text-xs text-foreground-secondary">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
            className="mt-0.5"
          />
          <span>
            <strong className="text-foreground">Pari public</strong> — visible sur le registre
            /paris, résolu devant tous (180 jours max).
          </span>
        </label>
        {form.isPublic ? (
          <label className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs text-foreground-secondary" style={{ borderColor: "var(--color-border)" }}>
            <input
              type="checkbox"
              checked={form.dominosAttestation}
              onChange={(e) => setForm((f) => ({ ...f, dominosAttestation: e.target.checked }))}
              className="mt-0.5"
            />
            <span>
              J&apos;atteste que l&apos;échec de ce pari coûte à la marque (réputation/argent) et
              qu&apos;il <strong className="text-foreground">n&apos;incite aucun tiers à prendre des risques</strong> pour
              tenir la promesse.
            </span>
          </label>
        ) : null}
        <div>
          <Button
            size="sm"
            loading={declare.isPending}
            disabled={declare.isPending || form.statement.trim().length < 20}
            onClick={() =>
              declare.mutate({
                strategyId,
                kind: "PLEDGE",
                subjectType: form.subjectType,
                statement: form.statement.trim(),
                predictedValue: form.predictedValue.trim() ? Number(form.predictedValue) : undefined,
                confidence: form.confidence,
                horizonDays: form.horizonDays,
                isPublic: form.isPublic,
                dominosAttestation: form.dominosAttestation,
              })
            }
          >
            Enregistrer le pari
          </Button>
        </div>
      </div>

      {list.data && list.data.length > 0 ? (
        <ul className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          {list.data.map((p) => (
            <li key={p.id} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--color-border)" }}>
              <span className="font-medium text-foreground">{p.statement}</span>
              <span className="ml-2 text-foreground-muted">
                {p.status === "OPEN" ? "en cours" : p.status === "HIT" ? "tenu" : p.status === "MISS" ? "raté" : "non tranché"}
                {p.isPublic ? " · public" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {due.data && due.data.length > 0 ? (
        <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          <h3 className="mb-2 text-xs font-semibold text-foreground">Échus — à trancher</h3>
          <ul className="space-y-2">
            {due.data.map((p) => (
              <li key={p.id} className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
                <p className="text-xs text-foreground">{p.statement}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={resolveNote[p.id] ?? ""}
                    onChange={(e) => setResolveNote((m) => ({ ...m, [p.id]: e.target.value }))}
                    placeholder="Note de résolution (10 caractères min — la preuve)"
                    className="min-w-[220px] flex-1 rounded-md border px-2 py-1.5 text-xs"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
                  />
                  {(["HIT", "MISS", "UNRESOLVED"] as const).map((o) => (
                    <Button
                      key={o}
                      size="sm"
                      variant="subtle"
                      disabled={resolve.isPending || (resolveNote[p.id] ?? "").trim().length < 10}
                      onClick={() => resolve.mutate({ id: p.id, outcome: o, note: (resolveNote[p.id] ?? "").trim() })}
                    >
                      {o === "HIT" ? "Tenu" : o === "MISS" ? "Raté" : "Non tranché"}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
