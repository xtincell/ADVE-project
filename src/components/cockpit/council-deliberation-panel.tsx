"use client";

/**
 * Analyse approfondie — la surface qui convoque RÉELLEMENT le conseil.
 *
 * Le conseil de marque (ADR-0180) existe depuis sa livraison : un coordinateur
 * et quatre experts A/D/V/E à mandat contradictoire. Mais seul le coordinateur
 * répondait dans le chat, et la délibération n'était atteignable que par une
 * procédure opérateur — donc jamais par un fondateur. Interrogé sur ses
 * confrères, le coordinateur allait chercher « agents adverses » dans le
 * dossier de la marque et répondait que ça n'en faisait pas partie.
 *
 * Ce panneau ferme l'écart côté produit : un bouton, quatre critiques réelles,
 * et les désaccords non résolus rendus tels quels.
 *
 * Lecture seule — aucune écriture de pilier, aucun Intent (ADR-0180).
 */

import { useState } from "react";
import { Scale, Loader2, AlertTriangle, ShieldQuestion } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const PILLAR_LABEL: Record<string, string> = {
  a: "Authenticité",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
};

const VERDICT_LABEL: Record<string, string> = {
  APPROVE: "Valide",
  CHALLENGE: "Conteste",
  REJECT: "Rejette",
};

/** Sévérité → token de couleur DS (jamais de couleur brute). */
const SEVERITY_CLASS: Record<string, string> = {
  HIGH: "border-danger text-danger",
  MEDIUM: "border-warning text-warning",
  LOW: "border-border text-foreground-secondary",
};

export function CouncilDeliberationPanel({
  strategyId,
  topic,
}: {
  strategyId: string;
  /** Sujet soumis au conseil — typiquement le dernier échange du chat. */
  topic: string;
}) {
  const [requested, setRequested] = useState(false);

  const query = trpc.mestor.councilDeliberate.useQuery(
    { strategyId, topic },
    { enabled: requested && topic.trim().length >= 3, refetchOnWindowFocus: false, retry: false },
  );

  if (!requested) {
    return (
      <button
        onClick={() => setRequested(true)}
        disabled={topic.trim().length < 3}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground-secondary hover:bg-surface-raised disabled:opacity-50"
        title="Soumet la dernière réponse aux quatre experts, dont le mandat est de la contester"
      >
        <Scale className="h-4 w-4" />
        Analyse approfondie
      </button>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Consultation des quatre experts…
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-danger p-3 text-sm text-danger">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>L&apos;analyse approfondie n&apos;a pas pu aboutir. Réessayez dans quelques minutes.</span>
      </div>
    );
  }

  const d = query.data;
  if (!d) return null;

  if (d.status === "TIER_GATE_DENIED") {
    return (
      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="text-foreground">{d.reason}</p>
        <a href={d.configureUrl} className="mt-1 inline-block text-accent underline">
          Voir les formules
        </a>
      </div>
    );
  }

  if (d.status === "UNAVAILABLE") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-warning p-3 text-sm text-warning">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{d.reason}</span>
      </div>
    );
  }

  const critiques = Object.entries(d.critiques);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-accent" />
        <h4 className="font-semibold text-foreground">Analyse du conseil</h4>
      </div>

      {/* Honnêteté : quand aucun expert n'a répondu, on ne présente PAS le
          draft seul comme une délibération. */}
      {!d.deliberated && (
        <div className="flex items-start gap-2 rounded-lg border border-warning p-3 text-sm text-warning">
          <ShieldQuestion className="h-4 w-4 shrink-0" />
          <span>
            Aucun expert n&apos;a pu être consulté cette fois — ce qui suit est la position du
            coordinateur seul, pas un avis contradictoire.
          </span>
        </div>
      )}

      <section>
        <h5 className="text-sm font-medium text-foreground-secondary">Position soumise</h5>
        <p className="mt-1 text-sm text-foreground">{d.draft.position}</p>
      </section>

      {critiques.length > 0 && (
        <section className="space-y-3">
          <h5 className="text-sm font-medium text-foreground-secondary">
            Ce que les experts contestent
          </h5>
          {critiques.map(([key, c]) => {
            const label = PILLAR_LABEL[key] ?? key.toUpperCase();
            if ("failed" in c) {
              return (
                <div key={key} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-foreground-secondary">
                    Cet expert n&apos;a pas pu se prononcer.
                  </p>
                </div>
              );
            }
            return (
              <div key={key} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">
                  {label} — {VERDICT_LABEL[c.verdict] ?? c.verdict}
                </p>
                <ul className="mt-2 space-y-2">
                  {c.critiques.map((k, i) => (
                    <li
                      key={i}
                      className={`border-l-2 pl-3 text-sm ${SEVERITY_CLASS[k.severity] ?? SEVERITY_CLASS.LOW}`}
                    >
                      <span className="text-foreground">{k.claim}</span>
                      <span className="block text-xs text-foreground-secondary">{k.evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {d.synthesis && (
        <section className="space-y-3">
          <h5 className="text-sm font-medium text-foreground-secondary">Position retenue</h5>
          <p className="text-sm text-foreground">{d.synthesis.finalPosition}</p>

          {d.synthesis.actionItems.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
              {d.synthesis.actionItems.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}

          {/* Les désaccords non résolus sont livrés tels quels — un consensus
              fabriqué vaudrait moins que la mention du désaccord. */}
          {d.synthesis.dissent.length > 0 && (
            <div className="rounded-lg border border-warning p-3">
              <p className="text-sm font-medium text-warning">Désaccords non résolus</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground-secondary">
                {d.synthesis.dissent.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
