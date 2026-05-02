/**
 * /status — operational health (uptime + latest IntentEmission).
 * Mission contribution: GROUND_INFRASTRUCTURE — public confidence surface.
 */
import { db } from "@/lib/db";
import { listProviders } from "@/server/services/payment-providers";
import { listAvailableModels } from "@/server/services/llm-gateway/router";

export const revalidate = 60; // refresh every minute

async function loadStatus() {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [recentSuccess, recentFail, last24h, last7d, lastIntent] = await Promise.all([
    db.intentEmission.count({ where: { status: "OK", emittedAt: { gte: since } } }).catch(() => 0),
    db.intentEmission.count({ where: { status: "FAILED", emittedAt: { gte: since } } }).catch(() => 0),
    db.intentEmission.count({ where: { emittedAt: { gte: since } } }).catch(() => 0),
    db.intentEmission.count({ where: { emittedAt: { gte: since7d } } }).catch(() => 0),
    db.intentEmission.findFirst({
      orderBy: { emittedAt: "desc" },
      select: { intentKind: true, status: true, emittedAt: true, governor: true },
    }).catch(() => null),
  ]);

  const successRate = recentSuccess + recentFail > 0
    ? (recentSuccess / (recentSuccess + recentFail)) * 100
    : 100;

  const providers = listProviders();
  const models = listAvailableModels();

  return { recentSuccess, recentFail, last24h, last7d, lastIntent, successRate, providers, models };
}

export default async function StatusPage() {
  const s = await loadStatus();
  const overall = s.successRate >= 99
    ? { label: "Opérationnel", color: "text-success", bg: "bg-success/30 border-success/60" }
    : s.successRate >= 95
      ? { label: "Dégradation partielle", color: "text-warning", bg: "bg-warning/30 border-warning/60" }
      : { label: "Incident", color: "text-error", bg: "bg-error/30 border-error/60" };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warning/80">Status</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Santé de l&apos;OS</h1>
      </header>

      {/* Overall */}
      <section className={"mb-6 rounded-2xl border p-5 " + overall.bg}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-foreground-muted">État global</div>
            <div className={"mt-1 text-2xl font-bold " + overall.color}>{overall.label}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Réussite 24h</div>
            <div className={"mt-1 font-mono text-3xl " + overall.color}>{s.successRate.toFixed(1)}%</div>
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
        <section className="mb-6 rounded-xl border border-border bg-background p-5">
          <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Dernier Intent émis</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-mono text-sm text-foreground">{s.lastIntent.intentKind}</span>
            <span className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-foreground-secondary">
              {s.lastIntent.governor}
            </span>
            <span className={
              "rounded px-2 py-0.5 text-[10px] font-semibold " +
              (s.lastIntent.status === "OK"
                ? "bg-success/40 text-success"
                : s.lastIntent.status === "FAILED"
                  ? "bg-error/40 text-error"
                  : "bg-background text-foreground-secondary")
            }>
              {s.lastIntent.status}
            </span>
            <span className="ml-auto text-[10px] text-foreground-muted">{new Date(s.lastIntent.emittedAt).toLocaleString("fr-FR")}</span>
          </div>
        </section>
      )}

      {/* Providers + models */}
      <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">Paiement</h2>
          <ul className="space-y-1.5 text-sm">
            {s.providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="font-mono text-foreground-secondary">{p.id}</span>
                <span className={p.configured ? "text-success" : "text-foreground-muted"}>
                  {p.configured ? "✓ actif" : "non-configuré"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-background p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">LLM disponibles</h2>
          {s.models.length === 0 ? (
            <p className="text-xs text-foreground-muted">Aucun fournisseur LLM configuré.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {s.models.map((m) => (
                <li key={`${m.provider}-${m.model}`} className="flex items-center justify-between">
                  <span className="font-mono text-foreground-secondary">{m.provider}:{m.model}</span>
                  <span className="text-[10px] text-foreground-muted">~{m.typicalLatencyMs}ms</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-center text-[10px] text-foreground-muted">Mise à jour : à la minute. Données : IntentEmission rolling 24h/7j.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[10px] uppercase tracking-wider text-foreground-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-foreground">{value.toLocaleString("fr-FR")}</div>
    </div>
  );
}
