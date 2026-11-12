/**
 * /status — operational health (uptime + latest IntentEmission).
 * Mission contribution: GROUND_INFRASTRUCTURE — public confidence surface.
 */
import { db } from "@/lib/db";
import { listProviders } from "@/server/services/payment-providers";
import { listAvailableModels } from "@/server/services/llm-gateway/router";
import { derivePublicStatus } from "@/lib/public-status";

export const revalidate = 60; // refresh every minute

async function loadStatus() {
  // Pendant la construction de l'image, DATABASE_URL est absent : aucune mesure,
  // donc aucun verdict (la page est revalidée à l'exécution).
  if (!process.env.DATABASE_URL) {
    return {
      status: derivePublicStatus({ ok: null, failed: null }),
      recentSuccess: null, recentFail: null, last24h: null, last7d: null,
      lastIntent: null, providers: [], models: [],
    };
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  // Une lecture échouée reste `null` : elle ne devient jamais un zéro qui
  // ferait afficher « Opérationnel » quand la base est injoignable.
  const [recentSuccess, recentFail, last24h, last7d, lastIntent] = await Promise.all([
    db.intentEmission.count({ where: { status: "OK", emittedAt: { gte: since } } }).catch(() => null),
    db.intentEmission.count({ where: { status: "FAILED", emittedAt: { gte: since } } }).catch(() => null),
    db.intentEmission.count({ where: { emittedAt: { gte: since } } }).catch(() => null),
    db.intentEmission.count({ where: { emittedAt: { gte: since7d } } }).catch(() => null),
    db.intentEmission.findFirst({
      orderBy: { emittedAt: "desc" },
      select: { intentKind: true, status: true, emittedAt: true, governor: true },
    }).catch(() => null),
  ]);

  const providers = listProviders();
  const models = listAvailableModels();

  return {
    status: derivePublicStatus({ ok: recentSuccess, failed: recentFail }),
    recentSuccess, recentFail, last24h, last7d, lastIntent, providers, models,
  };
}

const VERDICT_DISPLAY = {
  OPERATIONAL: { label: "Opérationnel", color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-900/60" },
  DEGRADED: { label: "Dégradation partielle", color: "text-amber-400", bg: "bg-amber-950/30 border-amber-900/60" },
  INCIDENT: { label: "Incident", color: "text-red-400", bg: "bg-red-950/30 border-red-900/60" },
  UNKNOWN: { label: "Non mesuré", color: "text-foreground-secondary", bg: "bg-surface-raised border-border" },
} as const;

const UNKNOWN_REASON = {
  UNREACHABLE: "Le journal des opérations n'a pas pu être lu : aucun état n'est affiché sans mesure.",
  NO_ACTIVITY: "Aucune opération journalisée sur les dernières 24 h : rien ne permet de calculer un taux de réussite.",
} as const;

export default async function StatusPage() {
  const s = await loadStatus();
  const overall = VERDICT_DISPLAY[s.status.verdict];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <div className="text-2xs font-semibold uppercase tracking-[0.2em] text-amber-500/80">Status</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-100">Santé de l&apos;OS</h1>
      </header>

      {/* Overall */}
      <section className={"mb-6 rounded-2xl border p-5 " + overall.bg}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xs uppercase tracking-wider text-zinc-500">État global</div>
            <div className={"mt-1 text-2xl font-bold " + overall.color}>{overall.label}</div>
            {s.status.reason !== "MEASURED" && (
              <p className="mt-1 max-w-md text-xs text-foreground-muted">{UNKNOWN_REASON[s.status.reason]}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xs uppercase tracking-wider text-zinc-500">Réussite 24h</div>
            <div className={"mt-1 font-mono text-3xl " + overall.color}>
              {s.status.successRate === null ? "—" : `${s.status.successRate.toFixed(1)}%`}
            </div>
          </div>
        </div>
      </section>

      {/* Activity */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Succès 24h" value={s.recentSuccess} />
        <Stat label="Échecs 24h" value={s.recentFail} />
        <Stat label="Total 24h" value={s.last24h} />
        <Stat label="Total 7j" value={s.last7d} />
      </section>

      {/* Last intent */}
      {s.lastIntent && (
        <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-2xs uppercase tracking-wider text-zinc-500">Dernière opération journalisée</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-mono text-sm text-zinc-200">{s.lastIntent.intentKind}</span>
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-2xs text-zinc-400">
              {s.lastIntent.governor}
            </span>
            <span className={
              "rounded px-2 py-0.5 text-2xs font-semibold " +
              (s.lastIntent.status === "OK"
                ? "bg-emerald-950/40 text-emerald-300"
                : s.lastIntent.status === "FAILED"
                  ? "bg-red-950/40 text-red-300"
                  : "bg-zinc-900 text-zinc-400")
            }>
              {s.lastIntent.status}
            </span>
            <span className="ml-auto text-2xs text-zinc-500">{new Date(s.lastIntent.emittedAt).toLocaleString("fr-FR")}</span>
          </div>
        </section>
      )}

      {/* Providers + models */}
      <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-300">Paiement</h2>
          <ul className="space-y-1.5 text-sm">
            {s.providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="font-mono text-zinc-300">{p.id}</span>
                <span className={p.configured ? "text-emerald-400" : "text-zinc-600"}>
                  {p.configured ? "configuré" : "non configuré"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-300">LLM disponibles</h2>
          {s.models.length === 0 ? (
            <p className="text-xs text-zinc-500">Aucun fournisseur LLM configuré.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {s.models.map((m) => (
                <li key={`${m.provider}-${m.model}`} className="flex items-center justify-between">
                  <span className="font-mono text-zinc-300">{m.provider}:{m.model}</span>
                  <span className="text-2xs text-zinc-500">{m.subscriptionQuota ? "Abonnement · quota" : m.typicalLatencyMs == null ? "Latence à mesurer" : `~${m.typicalLatencyMs}ms`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-center text-2xs text-zinc-600">
        Mise à jour : au plus toutes les minutes. Données : journal des opérations, fenêtres glissantes 24 h / 7 j.
        Un moyen de paiement « configuré » a ses clés posées ; cela ne prouve pas qu&apos;un paiement réel a abouti.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-2xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-zinc-100">{value === null ? "—" : value.toLocaleString("fr-FR")}</div>
    </div>
  );
}
