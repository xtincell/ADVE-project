import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { History, ShieldAlert, ShieldCheck } from "lucide-react";
import { readSession } from "@/lib/session";
import {
  getBrandForSession,
  getBrandRevisionAudit,
  type ChainStatus,
  type RevisionCheckStatus,
} from "@/server/brand";
import { getFieldDef, PILLAR_LABELS } from "@/domain/pillar-fields";
import type { PillarKey } from "@/domain/pillars";
import { formatRevisionDiff } from "@/domain/revision-diff";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Révisions" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Libellés FR des reasons (registre du schéma + ai_draft WP-010). */
const REASON_LABELS: Record<string, string> = {
  intake: "intake",
  operator_amend: "amendement opérateur",
  rtis_refresh: "dérivation RTIS",
  ai_draft: "brouillon IA",
  import: "import",
};

function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

const CHAIN_STATUS_UI: Record<
  ChainStatus,
  { label: string; className: string }
> = {
  OK: { label: "OK", className: "bg-success/15 text-success" },
  RUPTURE: { label: "Rupture", className: "bg-coral/15 text-coral" },
  NON_SIGNEE: { label: "Non signée", className: "bg-warning/15 text-warning" },
  VIDE: { label: "Vide", className: "bg-white/10 text-sand" },
};

const CHECK_LABELS: Record<RevisionCheckStatus, string> = {
  ok: "vérifiée",
  unsigned: "non signée",
  broken_link: "chaînage rompu",
  hash_mismatch: "hash falsifié",
};

/** Détail lisible d'un diff : « +2 champs (Nom, Secteur) · ~1 modifié (Valeurs) ». */
function diffDetail(
  pillarKey: PillarKey,
  ids: string[],
  max = 3,
): string {
  const labels = ids.slice(0, max).map((id) => getFieldDef(pillarKey, id)?.label ?? id);
  const rest = ids.length - labels.length;
  return labels.join(", ") + (rest > 0 ? ` +${rest}` : "");
}

/**
 * Révisions — port de l'esprit « sources/history » du cockpit legacy sur les
 * données v7 : timeline PillarRevision cross-piliers (qui, quand, quoi,
 * pourquoi) + état RÉEL de la chaîne de hash (chaque selfHash est recalculé
 * depuis les données stockées — cf. `verifyRevisionChain`). Lecture seule.
 */
export default async function RevisionsPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/revisions");

  const brand = await getBrandForSession(session);
  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Traçabilité</p>
          <h1 className="font-display text-3xl font-semibold">Révisions</h1>
        </header>
        <EmptyState
          icon={<History />}
          title="Aucune marque dans cet espace"
          description="Chaque écriture de pilier laisse une révision hash-chaînée — il faut d'abord une marque. Commencez par le diagnostic gratuit."
        >
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "md" })}>
            Commencer le diagnostic
          </Link>
        </EmptyState>
      </div>
    );
  }

  const audit = await getBrandRevisionAudit({ id: brand.id, workspaceId: brand.workspaceId });
  const broken = audit.chains.filter((c) => c.status === "RUPTURE");
  const allOk = audit.chains.length > 0 && audit.chains.every((c) => c.status === "OK");

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="eyebrow text-coral">Traçabilité</p>
        <h1 className="font-display text-3xl font-semibold">Révisions — {brand.name}</h1>
        <p className="max-w-2xl text-sm text-sand">
          Toute écriture de pilier laisse une révision append-only, chaînée par hash (chaque
          révision signe la précédente). Cette page recalcule réellement chaque hash — une
          falsification a posteriori casserait la chaîne, visiblement.
        </p>
      </header>

      {/* ── État des chaînes de hash (calcul réel) ─────────────────────── */}
      <section className="space-y-4" aria-label="État des chaînes de hash">
        {audit.total === 0 ? null : allOk ? (
          <div className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-bone">
                Chaîne d&apos;audit intacte — {audit.total} révision{audit.total > 1 ? "s" : ""}{" "}
                vérifiée{audit.total > 1 ? "s" : ""} sur {audit.chains.length} pilier
                {audit.chains.length > 1 ? "s" : ""}.
              </p>
              <p className="text-sand">
                Chaque selfHash a été recalculé depuis les données stockées et comparé à la
                valeur signée — aucun écart.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-coral/40 bg-coral/8 p-4">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-bone">
                {broken.length > 0
                  ? `Rupture de chaîne détectée sur ${broken
                      .map((c) => `${PILLAR_LABELS[c.pillarKey]} (v${c.firstBreak?.version})`)
                      .join(", ")}.`
                  : "Certaines révisions ne sont pas signées — chaîne partiellement vérifiable."}
              </p>
              <p className="text-sand">
                Une rupture signifie qu&apos;une révision stockée ne correspond plus à son hash
                signé, ou que le chaînage a été réécrit. Signalez-le à l&apos;équipe UPgraders.
              </p>
            </div>
          </div>
        )}

        {audit.chains.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {audit.chains.map((chain) => {
              const ui = CHAIN_STATUS_UI[chain.status];
              return (
                <span
                  key={chain.pillarKey}
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-ink-2 px-3 py-1.5 text-sm"
                  title={
                    chain.firstBreak
                      ? `Première anomalie : v${chain.firstBreak.version} (${CHECK_LABELS[chain.firstBreak.kind]})`
                      : `${chain.revisionCount} révision${chain.revisionCount > 1 ? "s" : ""} vérifiée${chain.revisionCount > 1 ? "s" : ""}`
                  }
                >
                  <span className="font-mono text-xs font-bold text-sand-2">
                    {chain.pillarKey}
                  </span>
                  <span className="text-sand">{chain.revisionCount} rév.</span>
                  <span
                    className={`rounded-xs px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${ui.className}`}
                  >
                    {ui.label}
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* ── Timeline cross-piliers ─────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Timeline des révisions">
        <div>
          <h2 className="font-display text-xl font-semibold">Timeline</h2>
          <p className="text-sm text-sand">
            Qui a écrit quoi, quand, et pourquoi — tous piliers confondus, plus récentes
            d&apos;abord.
          </p>
        </div>

        {audit.timeline.length === 0 ? (
          <EmptyState
            icon={<History />}
            title="Aucune révision"
            description="La première révision sera enregistrée à la première écriture de pilier (intake, amendement, dérivation RTIS ou brouillon IA)."
          />
        ) : (
          <ol className="divide-y divide-line-soft rounded-lg border border-line bg-ink-2">
            {audit.timeline.map((entry) => {
              const diffLine = formatRevisionDiff(entry.diff);
              return (
                <li key={entry.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-white/6 font-mono text-xs font-bold text-sand-2"
                      title={`Pilier ${PILLAR_LABELS[entry.pillarKey]}`}
                      aria-hidden
                    >
                      {entry.pillarKey}
                    </span>
                    <span className="font-mono text-xs text-smoke-2">v{entry.version}</span>
                    <span className="text-sm font-semibold text-bone">
                      {reasonLabel(entry.reason)}
                    </span>
                    <span className="text-sm text-sand">
                      {entry.actorLabel ?? (entry.actorId ? "acteur inconnu" : "système")}
                    </span>
                    <span className="ml-auto font-mono text-xs text-smoke-2">
                      {DATE_FORMAT.format(entry.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-10 text-sm">
                    {diffLine ? (
                      <span className="text-sand">{diffLine}</span>
                    ) : (
                      <span className="italic text-smoke-2">aucun champ métier modifié</span>
                    )}
                    {entry.check !== "ok" ? (
                      <span
                        className={`rounded-xs px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          entry.check === "unsigned"
                            ? "bg-warning/15 text-warning"
                            : "bg-coral/15 text-coral"
                        }`}
                      >
                        {CHECK_LABELS[entry.check]}
                      </span>
                    ) : null}
                  </div>
                  {entry.diff.added.length + entry.diff.changed.length + entry.diff.removed.length >
                  0 ? (
                    <p className="mt-1 pl-10 text-xs text-smoke-2">
                      {entry.diff.added.length > 0
                        ? `Ajoutés : ${diffDetail(entry.pillarKey, entry.diff.added)}`
                        : null}
                      {entry.diff.added.length > 0 &&
                      (entry.diff.changed.length > 0 || entry.diff.removed.length > 0)
                        ? " · "
                        : null}
                      {entry.diff.changed.length > 0
                        ? `Modifiés : ${diffDetail(entry.pillarKey, entry.diff.changed)}`
                        : null}
                      {entry.diff.changed.length > 0 && entry.diff.removed.length > 0
                        ? " · "
                        : null}
                      {entry.diff.removed.length > 0
                        ? `Effacés : ${diffDetail(entry.pillarKey, entry.diff.removed)}`
                        : null}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <p className="text-xs text-smoke-2">
        L&apos;historique champ par champ d&apos;un pilier se lit dans son éditeur (ligne « v·n »
        sous chaque champ). Les révisions sont la mémoire de la méthode : append-only, jamais
        réécrites.
      </p>
    </div>
  );
}
