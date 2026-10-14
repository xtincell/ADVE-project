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
import { MarkdownContent } from "@/components/shared/markdown-content";

const PILLAR_LABEL: Record<string, string> = {
  a: "Authenticité",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
};

const VERDICT_LABEL: Record<string, string> = {
  APPROVE: "Appuie",
  CHALLENGE: "Conteste",
  REJECT: "Rejette",
};

/**
 * Sévérité → token de couleur DS.
 *
 * Écrit d'abord avec `danger` — un token qui **n'existe pas** dans le DS (le
 * canon est `error`, cf. `styles/globals.css`). Tailwind ne générait donc
 * aucune classe : une critique HIGH s'affichait exactement comme une LOW, et la
 * bannière d'erreur n'était pas rouge. Le test DS ne l'a pas vu — il interdit
 * les palettes BRUTES, pas les tokens inexistants (relecture adversariale).
 */
const SEVERITY_CLASS: Record<string, string> = {
  HIGH: "border-error text-error",
  MEDIUM: "border-warning text-warning",
  LOW: "border-border text-foreground-secondary",
};

/** Bornes du schéma tRPC — tronquer ici évite un refus serveur silencieux. */
const TOPIC_MAX = 2_000;
const DRAFT_MAX = 8_000;

export function CouncilDeliberationPanel({
  strategyId,
  answer,
}: {
  strategyId: string;
  /** La réponse de l'assistant que les experts doivent contester. */
  answer: string;
}) {
  const [requested, setRequested] = useState(false);

  // La réponse est passée en `draft`, PAS seulement en `topic`.
  //
  // Sans `draft`, `deliberate()` fait rédiger au coordinateur une position
  // NEUVE que les experts attaquent ensuite : la réponse affichée à l'écran
  // n'était jamais soumise à personne, alors que le bouton promettait de la
  // soumettre. Le champ existait déjà côté serveur — il n'était pas branché.
  const draft = answer.slice(0, DRAFT_MAX);
  const topic = answer.slice(0, TOPIC_MAX);
  const truncated = answer.length > DRAFT_MAX;

  // Une délibération coûte 5 appels LLM sur le budget de la marque : elle ne
  // doit partir QUE sur un clic. `refetchOnWindowFocus: false` et `retry: false`
  // n'y suffisaient pas — `refetchOnReconnect` vaut `true` par défaut et le
  // `staleTime` global n'est que de 30 s. Une coupure réseau de dix secondes
  // (capot fermé, passage en 4G) relançait donc l'analyse toute seule, sans
  // clic, en consommant le budget posé pour l'en empêcher ; et comme
  // `isLoading` est faux pendant un refetch, l'écran remplaçait l'analyse en
  // silence — ou par le bloc RATE_LIMITED que ce même refetch venait de
  // déclencher.
  const query = trpc.mestor.councilDeliberate.useQuery(
    { strategyId, topic, draft },
    {
      enabled: requested && topic.trim().length >= 3,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: false,
      staleTime: Infinity,
    },
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
      <div className="flex items-start gap-2 rounded-lg border border-error p-3 text-sm text-error">
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

  if (d.status === "RATE_LIMITED") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-warning p-3 text-sm text-warning">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{d.reason}</span>
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

      {/* Sur quoi l'analyse s'appuie. Un avis rendu sans document est un avis de
          cohérence, pas une vérification — le dire est la moitié de sa valeur. */}
      {d.grounding.expertsWithSources.length > 0 ? (
        <p className="text-xs text-foreground-secondary">
          Extraits documentaires disponibles pour :{" "}
          {d.grounding.expertsWithSources.map((k) => PILLAR_LABEL[k] ?? k.toUpperCase()).join(", ")}.
        </p>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-foreground-secondary">
          <ShieldQuestion className="h-4 w-4 shrink-0" />
          <span>
            Aucun document de votre marque n&apos;a pu être consulté : cette analyse porte sur la
            cohérence de vos piliers, pas sur la conformité à vos documents. Déposez-les dans vos
            sources pour qu&apos;ils servent de référence.
          </span>
        </div>
      )}

      <section>
        <h5 className="text-sm font-medium text-foreground-secondary">Position soumise</h5>
        <MarkdownContent className="mt-1 text-foreground">{d.draft.position}</MarkdownContent>
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
                      <MarkdownContent className="text-foreground">{k.claim}</MarkdownContent>
                      <MarkdownContent className="text-xs text-foreground-secondary">{k.evidence}</MarkdownContent>
                    </li>
                  ))}
                </ul>
                {c.missingAngles.length > 0 && <div className="mt-3 space-y-2">
                  <h6 className="text-sm font-medium text-foreground-secondary">Angles à examiner</h6>
                  <ul className="list-disc space-y-2 pl-5">{c.missingAngles.map((text, i) =>
                    <li key={i}><MarkdownContent>{text}</MarkdownContent></li>)}</ul>
                </div>}
                {c.amendments.length > 0 && <div className="mt-3 space-y-2">
                  <h6 className="text-sm font-medium text-foreground-secondary">Modifications proposées</h6>
                  <ul className="list-disc space-y-2 pl-5">{c.amendments.map((text, i) =>
                    <li key={i}><MarkdownContent>{text}</MarkdownContent></li>)}</ul>
                </div>}
              </div>
            );
          })}
        </section>
      )}

      {/* `deliberated: true` + `synthesis: null` = l'arbitrage a échoué APRÈS
          les critiques. Faire disparaître le bloc en silence serait le mensonge
          par omission symétrique de celui qu'on corrige juste au-dessus. */}
      {d.deliberated && !d.synthesis && (
        <div className="flex items-start gap-2 rounded-lg border border-warning p-3 text-sm text-warning">
          <ShieldQuestion className="h-4 w-4 shrink-0" />
          <span>
            Les experts se sont prononcés, mais la synthèse n&apos;a pas abouti — il n&apos;y a
            pas de position retenue à afficher. Les critiques ci-dessus restent valables.
          </span>
        </div>
      )}

      {truncated && (
        <p className="text-xs text-foreground-secondary">
          La réponse analysée a été tronquée à {DRAFT_MAX.toLocaleString("fr-FR")} caractères.
        </p>
      )}

      {d.synthesis && (
        <section className="space-y-3">
          <h5 className="text-sm font-medium text-foreground-secondary">Position retenue</h5>
          <MarkdownContent className="text-foreground">{d.synthesis.finalPosition}</MarkdownContent>

          {d.synthesis.acceptedCritiques.length > 0 && <div className="space-y-2">
            <h6 className="text-sm font-medium text-foreground-secondary">Contestations retenues</h6>
            {d.synthesis.acceptedCritiques.map((item, i) => <div key={i} className="space-y-1 border-l-2 border-border pl-3">
              <p className="text-xs text-foreground-secondary">{PILLAR_LABEL[item.from] ?? item.from}</p>
              <MarkdownContent>{item.claim}</MarkdownContent>
              <MarkdownContent className="text-foreground-secondary">{item.resolution}</MarkdownContent>
            </div>)}
          </div>}
          {d.synthesis.rejectedCritiques.length > 0 && <div className="space-y-2">
            <h6 className="text-sm font-medium text-foreground-secondary">Contestations écartées</h6>
            {d.synthesis.rejectedCritiques.map((item, i) => <div key={i} className="space-y-1 border-l-2 border-border pl-3">
              <p className="text-xs text-foreground-secondary">{PILLAR_LABEL[item.from] ?? item.from}</p>
              <MarkdownContent>{item.claim}</MarkdownContent>
              <MarkdownContent className="text-foreground-secondary">{item.reason}</MarkdownContent>
            </div>)}
          </div>}

          {d.synthesis.actionItems.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
              {d.synthesis.actionItems.map((a, i) => (
                <li key={i}><MarkdownContent>{a}</MarkdownContent></li>
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
                  <li key={i}><MarkdownContent>{x}</MarkdownContent></li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
