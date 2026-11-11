"use client";

/**
 * Historique du catalogue produit (pilier V) — entrées, retraits, réintroductions
 * et renommages, lus dans les versions conservées par `pillar.getCatalogueHistory`.
 * Lecture seule ; chargé à l'ouverture. Aucun produit rapproché par son nom :
 * un produit sans identifiant est compté, pas suivi.
 */

import { useState } from "react";
import { History, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/primitives/badge";

type Kind = "APPEARED" | "RETIRED" | "REINTRODUCED" | "RENAMED";
type Proof = "RESTORATION" | "NONE" | "UNKNOWN" | null;
interface Write { at: string; author: string | null; compensatedFrom: string | null }
interface HistoryEvent {
  kind: Kind; productId: string; name: string | null; previousName: string | null;
  fromVersion: number | null; toVersion: number; write: Write | null; proof: Proof;
}

const KIND_LABEL: Record<Kind, string> = {
  APPEARED: "Entrée", RETIRED: "Retrait", REINTRODUCED: "Réintroduction", RENAMED: "Renommage",
};
const KIND_TONE: Record<Kind, "success" | "warning" | "info" | "neutral"> = {
  APPEARED: "success", RETIRED: "warning", REINTRODUCED: "info", RENAMED: "neutral",
};
const PROOF_TEXT: Record<Exclude<Proof, null>, string> = {
  RESTORATION: "Réintroduit sous son identifiant par la restauration d’une version conservée.",
  NONE: "Identifiant repris sans restauration, avant la règle actuelle : identité à vérifier.",
  UNKNOWN: "Identifiant réapparu ; l’écriture correspondante n’est pas conservée.",
};

function describe(event: HistoryEvent): string {
  switch (event.kind) {
    case "APPEARED":
      return event.fromVersion === null ? "Présent dès la plus ancienne version conservée." : "Entré au catalogue.";
    case "RETIRED":
      return "Retiré du catalogue.";
    case "RENAMED":
      return `Renommé (ancien nom : « ${event.previousName ?? "sans nom"} »).`;
    case "REINTRODUCED": {
      const lastName = event.previousName && event.previousName !== event.name ? ` Dernier nom connu : « ${event.previousName} ».` : "";
      return `${PROOF_TEXT[event.proof ?? "UNKNOWN"]}${lastName}`;
    }
  }
}

function origin(write: Write | null): string {
  if (!write) return "Écriture non conservée";
  if (write.compensatedFrom) return "Restauration d’une version conservée";
  const system = write.author?.split(":")[0];
  if (!system) return "Auteur non enregistré";
  if (system === "OPERATOR") return "Modification de l’équipe";
  if (system === "INGESTION" || system === "BRIEF_INGEST") return "Lecture d’un document";
  return "Proposition automatique";
}

const dateLabel = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const versions = (event: HistoryEvent) =>
  event.fromVersion === null ? `version ${event.toVersion}` : `version ${event.fromVersion} → ${event.toVersion}`;

export function CatalogueHistoryPanel({ strategyId }: { strategyId: string }) {
  const [open, setOpen] = useState(false);
  const query = trpc.pillar.getCatalogueHistory.useQuery({ strategyId }, { enabled: open });
  const data = query.data;
  const events = data ? [...(data.events as HistoryEvent[])].reverse() : [];
  const reintroductions = events.filter(e => e.kind === "REINTRODUCED").length;

  return (
    <section aria-label="Historique du catalogue" className="rounded-xl border border-border bg-background p-4">
      <details onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="flex cursor-pointer items-center gap-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <History className="h-4 w-4 text-foreground-muted" aria-hidden />
          Historique du catalogue : entrées, retraits et réintroductions
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <p className="max-w-3xl text-foreground-muted">
            Lu dans les versions conservées du catalogue. Un produit retiré ne reprend son identifiant que par la
            restauration d’une version qui le contenait ; un nouvel ajout reçoit toujours un nouvel identifiant.
          </p>
          {query.isLoading ? (
            <p className="flex items-center gap-2 text-foreground-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Lecture de l’historique…</p>
          ) : query.error ? (
            <p role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning">Historique indisponible : {query.error.message}</p>
          ) : !data ? null : (
            <>
              <p className="text-foreground-secondary">
                {data.retiredIds.length} identifiant(s) retiré(s) du catalogue actuel · {reintroductions} réintroduction(s) · version actuelle {data.currentVersion}
              </p>
              {data.unidentified.current > 0 ? (
                <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning">
                  {data.unidentified.current} produit(s) du catalogue actuel sans identifiant : ils ne sont pas suivis ici et ne sont rapprochés d’aucun autre par leur nom.
                </p>
              ) : null}
              {data.unattributed.length > 0 ? (
                <p className="text-foreground-muted">
                  {data.unattributed.length} passage(s) de version sans écriture conservée : leurs changements sont listés sans auteur ni date.
                </p>
              ) : null}
              {events.length === 0 ? (
                <p className="text-foreground-muted">Aucun produit identifié dans les versions conservées.</p>
              ) : (
                <ol className="divide-y divide-border">
                  {events.map((event, index) => (
                    <li key={`${event.productId}-${event.toVersion}-${event.kind}-${index}`} className="grid items-start gap-x-3 gap-y-1 py-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
                      <Badge tone={KIND_TONE[event.kind]} className="justify-self-start">{KIND_LABEL[event.kind]}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {event.name ?? "Produit sans nom"} <span className="font-mono text-xs text-foreground-muted">{event.productId}</span>
                        </p>
                        <p className="text-foreground-secondary">{describe(event)}</p>
                        <p className="text-xs text-foreground-muted">
                          {origin(event.write)} · {event.write ? `${dateLabel(event.write.at)} · ` : ""}{versions(event)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </details>
    </section>
  );
}
