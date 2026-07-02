import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ScrollText, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  listAuditActions,
  listAuditLogs,
  listWorkspaceOptions,
  MAX_VERIFY_ROWS,
  parsePage,
  verifyAuditChains,
} from "@/server/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pager } from "../../pager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Audit" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** yyyy-mm-dd (input date) → Date, undefined si vide/invalide. */
function parseDay(raw: string | undefined): Date | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

type PageProps = {
  searchParams: Promise<{
    action?: string;
    chaine?: string;
    du?: string;
    au?: string;
    page?: string;
    verifier?: string;
  }>;
};

/**
 * /admin/audit — le journal d'audit hash-chaîné (successeur assumé du bus
 * Intents legacy et de son panneau console/governance/intents) : liste
 * filtrable action / chaîne (workspace) / dates + VÉRIFICATION D'INTÉGRITÉ :
 * recalcul des selfHash sur l'intervalle, chaîne par chaîne — OK ou ruptures
 * localisées. Lecture pure : vérifier n'écrit rien.
 */
export default async function AdminAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const action = params.action?.trim() || undefined;
  const chain = params.chaine?.trim() || "all";
  const from = parseDay(params.du);
  const auDay = parseDay(params.au);
  // Borne haute inclusive : la journée entière du jour « au ».
  const to = auDay ? new Date(auDay.getTime() + DAY_MS - 1) : undefined;
  const wantVerify = params.verifier === "1";

  const [{ rows, total }, actions, workspaces, verification] = await Promise.all([
    listAuditLogs({ action, chain, from, to, page }),
    listAuditActions(),
    listWorkspaceOptions(),
    wantVerify ? verifyAuditChains({ chain, from, to }) : Promise.resolve(null),
  ]);

  const preserved = {
    action,
    chaine: chain === "all" ? undefined : chain,
    du: params.du?.trim() || undefined,
    au: params.au?.trim() || undefined,
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Console</p>
        <h1 className="font-display text-3xl font-semibold">Journal d&apos;audit</h1>
        <p className="text-sm text-smoke">
          Toute mutation métier laisse une ligne hash-chaînée (selfHash ={" "}
          <span className="font-mono text-xs">sha256(prevHash + contenu)</span>, une chaîne
          par workspace). La vérification recalcule les hash sur l&apos;intervalle et
          localise toute altération ou maillon manquant.
        </p>
      </header>

      {/* ── Filtres + vérification (un seul formulaire GET, deux boutons) ── */}
      <form
        method="GET"
        action="/admin/audit"
        className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-card"
      >
        <div className="space-y-1.5">
          <label htmlFor="filter-action" className="block text-xs font-semibold text-graphite">
            Action
          </label>
          <Select
            id="filter-action"
            name="action"
            defaultValue={action ?? ""}
            className="h-9 w-52 font-mono text-xs"
          >
            <option value="">Toutes les actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="filter-chaine" className="block text-xs font-semibold text-graphite">
            Chaîne (workspace)
          </label>
          <Select id="filter-chaine" name="chaine" defaultValue={chain} className="h-9 w-56 text-xs">
            <option value="all">Toutes les chaînes</option>
            <option value="system">Système (sans workspace)</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="filter-du" className="block text-xs font-semibold text-graphite">
            Du
          </label>
          <Input
            id="filter-du"
            type="date"
            name="du"
            defaultValue={params.du ?? ""}
            className="h-9 w-40 font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="filter-au" className="block text-xs font-semibold text-graphite">
            Au (inclus)
          </label>
          <Input
            id="filter-au"
            type="date"
            name="au"
            defaultValue={params.au ?? ""}
            className="h-9 w-40 font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="h-9 rounded-sm bg-ink px-4 text-xs font-semibold text-bone transition-colors hover:bg-ink-3"
          >
            Filtrer
          </button>
          <button
            type="submit"
            name="verifier"
            value="1"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-coral px-4 text-xs font-semibold text-white shadow-glow-coral transition-colors hover:bg-coral-hover"
          >
            <ShieldCheck className="size-4" aria-hidden />
            Vérifier l&apos;intégrité
          </button>
        </div>
      </form>

      {/* ── Résultat de vérification ─────────────────────────────────── */}
      {verification ? (
        <section
          aria-live="polite"
          className={`rounded-lg border p-5 ${
            verification.ok
              ? "border-success/40 bg-success/8"
              : "border-coral/50 bg-coral/8"
          }`}
        >
          <div className="flex items-start gap-3">
            {verification.ok ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            ) : (
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-coral-deep" aria-hidden />
            )}
            <div className="space-y-2">
              <p className="font-display text-lg font-semibold text-ink">
                {verification.ok
                  ? "Intégrité vérifiée — aucune rupture"
                  : `Rupture de chaîne détectée (${verification.breaks.length})`}
              </p>
              <p className="text-sm text-graphite">
                {verification.scanned} ligne{verification.scanned > 1 ? "s" : ""} recalculée
                {verification.scanned > 1 ? "s" : ""} sur {verification.chains} chaîne
                {verification.chains > 1 ? "s" : ""}
                {from || to ? " (intervalle filtré)" : ""} — le filtre action ne s&apos;applique
                pas à la vérification.
              </p>
              {verification.truncated ? (
                <p className="text-xs font-semibold text-warning">
                  Cap de {MAX_VERIFY_ROWS} lignes atteint : l&apos;intervalle n&apos;est vérifié
                  que partiellement — resserrez les dates pour tout couvrir.
                </p>
              ) : null}
              {verification.boundaryUnverified > 0 ? (
                <p className="text-xs text-smoke">
                  {verification.boundaryUnverified} maillon
                  {verification.boundaryUnverified > 1 ? "s pointent" : " pointe"} avant le début
                  de l&apos;intervalle — chaînage non vérifiable localement (relancer sans date
                  de début pour une vérification complète).
                </p>
              ) : null}
              {verification.breaks.length > 0 ? (
                <ul className="space-y-1.5">
                  {verification.breaks.slice(0, 20).map((b) => (
                    <li key={b.id} className="rounded-sm bg-white/70 px-3 py-2 text-xs">
                      <span className="font-mono font-bold text-coral-deep">
                        {b.reason === "HASH_ALTERE" ? "LIGNE ALTÉRÉE" : "CHAÎNAGE ROMPU"}
                      </span>{" "}
                      <span className="font-mono text-graphite">
                        {DATE_FORMAT.format(b.createdAt)} · {b.action} ·{" "}
                        {b.workspaceId ?? "système"} · {b.id}
                      </span>
                      <span className="block text-smoke">{b.detail}</span>
                    </li>
                  ))}
                  {verification.breaks.length > 20 ? (
                    <li className="text-xs text-smoke">
                      … et {verification.breaks.length - 20} autre
                      {verification.breaks.length - 20 > 1 ? "s" : ""}.
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Journal ──────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <EmptyState
          tone="light"
          icon={<ScrollText />}
          title="Aucune ligne d'audit pour ces filtres"
          description="Le journal se remplit à chaque mutation métier (inscription, amendement de pilier, décision de paiement, édition de référentiel…)."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Date</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Action</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Chaîne</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Acteur</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Entité</th>
                  <th className="px-4 py-3 font-semibold text-graphite">selfHash</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((line) => (
                  <tr key={line.id} className="border-b border-ink/5 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {DATE_FORMAT.format(line.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">
                      {line.action}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {line.workspaceId ? (
                        <Link
                          href={`/admin/workspaces/${line.workspaceId}`}
                          className="font-semibold text-graphite hover:text-coral hover:underline"
                        >
                          {line.workspaceName ?? line.workspaceId}
                        </Link>
                      ) : (
                        <span className="text-smoke-2">système</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">
                      {line.actorId ? (
                        <Link
                          href={`/admin/utilisateurs/${line.actorId}`}
                          className="hover:text-coral hover:underline"
                        >
                          {line.actorEmail ?? line.actorId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">
                      {line.entity ? `${line.entity} · ${line.entityId ?? "—"}` : "—"}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-smoke-2"
                      title={line.selfHash}
                    >
                      {line.selfHash.slice(0, 12)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pathname="/admin/audit" params={preserved} page={page} total={total} />
        </>
      )}
    </div>
  );
}
