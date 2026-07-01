"use client";

/**
 * ArchivedStrategiesModal — 2-phase archive UI for Strategy entities.
 *
 * Phase 1: archive (soft) — strategy.archivedAt = now(). Hidden from default
 *          queries, restorable.
 * Phase 2: purge (hard)   — DELETE row + BFS cascade. Requires explicit
 *          confirmation. Irreversible.
 *
 * Tuile layout : logo/icon + name + quick details (status, archivedAt,
 * pillars/assets/missions counts) + 2 actions (Restore, Purge).
 */

import { useState, useMemo } from "react";
import { Archive, Building, RotateCcw, Trash2, X, AlertTriangle, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} jours`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an${days >= 730 ? "s" : ""}`;
}

export function ArchivedStrategiesModal({ open, onClose }: Props) {
  const utils = trpc.useUtils();
  const { data: archived, isLoading } = trpc.strategy.listArchived.useQuery(undefined, {
    enabled: open,
  });

  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);

  const restore = trpc.strategy.restore.useMutation({
    onSuccess: () => {
      utils.strategy.listArchived.invalidate();
      utils.strategy.list.invalidate();
    },
  });

  const purge = trpc.strategy.purge.useMutation({
    onSuccess: () => {
      utils.strategy.listArchived.invalidate();
      utils.strategy.list.invalidate();
      setConfirmPurgeId(null);
    },
  });

  const confirmTarget = useMemo(
    () => archived?.find((s) => s.id === confirmPurgeId) ?? null,
    [archived, confirmPurgeId],
  );

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[var(--z-modal-backdrop,80)] bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archived-modal-title"
        className="fixed inset-0 z-[var(--z-modal,90)] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-5xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-background-raised shadow-2xl">
          <header className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Archive className="h-4 w-4" />
              </div>
              <div>
                <h2 id="archived-modal-title" className="text-base font-semibold text-foreground">
                  Marques archivées
                </h2>
                <p className="text-xs text-foreground-muted">
                  {isLoading ? "Chargement…" : `${archived?.length ?? 0} marque${(archived?.length ?? 0) > 1 ? "s" : ""} archivée${(archived?.length ?? 0) > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-background-overlay hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-5">
            {isLoading && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-lg border border-border-subtle bg-background-overlay/30" />
                ))}
              </div>
            )}

            {!isLoading && (archived?.length ?? 0) === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Archive className="h-10 w-10 text-foreground-muted/40 mb-3" />
                <p className="text-sm font-medium text-foreground-secondary">Aucune marque archivée</p>
                <p className="mt-1 text-xs text-foreground-muted max-w-sm">
                  Quand tu archives une marque depuis la liste, elle apparaîtra ici. Les marques archivées sont
                  cachées des vues actives mais restent restaurables.
                </p>
              </div>
            )}

            {!isLoading && archived && archived.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map((s) => (
                  <ArchivedTile
                    key={s.id}
                    strategy={s}
                    onRestore={() => restore.mutate({ id: s.id })}
                    onPurge={() => setConfirmPurgeId(s.id)}
                    isRestoring={restore.isPending && restore.variables?.id === s.id}
                  />
                ))}
              </div>
            )}
          </div>

          {restore.error && (
            <div className="border-t border-error/30 bg-error/10 px-5 py-2 text-xs text-error">
              Restauration échouée : {restore.error.message}
            </div>
          )}
        </div>
      </div>

      {confirmTarget && (
        <PurgeConfirmDialog
          strategyName={confirmTarget.name}
          rowsCountEstimate={
            confirmTarget.counts.pillars +
            confirmTarget.counts.brandAssets +
            confirmTarget.counts.missions +
            confirmTarget.counts.dataSources
          }
          onCancel={() => setConfirmPurgeId(null)}
          onConfirm={(typedName) =>
            purge.mutate({ id: confirmTarget.id, confirmName: typedName })
          }
          isPurging={purge.isPending}
          error={purge.error?.message}
        />
      )}
    </>
  );
}

function ArchivedTile({
  strategy,
  onRestore,
  onPurge,
  isRestoring,
}: {
  strategy: {
    id: string;
    name: string;
    status: string;
    isDummy: boolean;
    archivedAt: string | Date;
    counts: { pillars: number; brandAssets: number; missions: number; dataSources: number };
  };
  onRestore: () => void;
  onPurge: () => void;
  isRestoring: boolean;
}) {
  const archivedDate = typeof strategy.archivedAt === "string" ? new Date(strategy.archivedAt) : strategy.archivedAt;
  const initial = strategy.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <article className="flex flex-col rounded-lg border border-border-subtle bg-background-overlay/40 p-4 hover:border-border transition-colors">
      <header className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent border border-accent/20">
          <span className="text-sm font-semibold">{initial}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate" title={strategy.name}>
            {strategy.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-foreground-muted">
            <span className="rounded-sm bg-background-overlay px-1.5 py-0.5 font-mono uppercase tracking-wide">
              {strategy.status}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelative(archivedDate)}
            </span>
          </div>
        </div>
        <Building className="h-4 w-4 shrink-0 text-foreground-muted/50" aria-hidden />
      </header>

      <dl className="mb-4 grid grid-cols-4 gap-1 text-center">
        <Metric label="Piliers" value={strategy.counts.pillars} />
        <Metric label="Assets" value={strategy.counts.brandAssets} />
        <Metric label="Missions" value={strategy.counts.missions} />
        <Metric label="Sources" value={strategy.counts.dataSources} />
      </dl>

      <footer className="mt-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onRestore}
          disabled={isRestoring}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background-raised px-2 py-1.5 text-xs font-medium text-foreground-secondary hover:border-accent hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          {isRestoring ? "…" : "Restaurer"}
        </button>
        <button
          type="button"
          onClick={onPurge}
          className="flex items-center justify-center gap-1.5 rounded-md border border-error/30 bg-error/5 px-2 py-1.5 text-xs font-medium text-error hover:bg-error/15 transition-colors"
          aria-label={`Supprimer définitivement ${strategy.name}`}
        >
          <Trash2 className="h-3 w-3" />
          Supprimer
        </button>
      </footer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-foreground-muted">{label}</div>
    </div>
  );
}

function PurgeConfirmDialog({
  strategyName,
  rowsCountEstimate,
  onCancel,
  onConfirm,
  isPurging,
  error,
}: {
  strategyName: string;
  rowsCountEstimate: number;
  onCancel: () => void;
  onConfirm: (typedName: string) => void;
  isPurging: boolean;
  error?: string;
}) {
  const [typed, setTyped] = useState("");
  const expected = strategyName.toUpperCase();
  const match = typed.toUpperCase() === expected;

  return (
    <>
      <div
        className="fixed inset-0 z-[var(--z-modal-backdrop,100)] bg-background/90 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="fixed inset-0 z-[var(--z-modal,110)] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-md rounded-xl border border-error/40 bg-background-raised shadow-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error/15 text-error">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Suppression définitive</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                Cette action est <strong className="text-error">irréversible</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-4 text-sm">
            <p className="text-foreground-secondary">
              Tu vas supprimer <strong className="text-foreground">{strategyName}</strong> et toutes ses
              dépendances (~{rowsCountEstimate}+ rows liées dans 30+ tables).
            </p>
            <p className="text-foreground-secondary">
              Pour confirmer, tape le nom de la marque en MAJUSCULES :
              <span className="ml-1 font-mono text-xs text-accent">{expected}</span>
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              className="w-full rounded-md border border-border bg-background-overlay px-3 py-2 text-sm text-foreground font-mono focus:border-error focus:outline-none focus:ring-1 focus:ring-error"
              placeholder={expected}
            />
          </div>

          {error && (
            <div className="mb-3 rounded-md border border-error/30 bg-error/10 p-2 text-xs text-error">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPurging}
              className="flex-1 rounded-md border border-border bg-background-overlay px-3 py-2 text-sm font-medium text-foreground-secondary hover:bg-background-raised disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => onConfirm(typed)}
              disabled={!match || isPurging}
              className="flex-1 rounded-md bg-error px-3 py-2 text-sm font-semibold text-white hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPurging ? "Suppression…" : "Supprimer définitivement"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
