"use client";

/**
 * <ApogeeMaintenanceDashboard /> — visibilité Loi 4 pour brands ICONE.
 *
 * Avant Phase 16-bis (ADR-0051 — anciennement ADR-0038), le cron `/api/cron/sentinels` tournait en
 * silence — founders ICONE n'avaient aucune visibilité sur les exécutions
 * MAINTAIN_APOGEE / DEFEND_OVERTON / EXPAND_TO_ADJACENT_SECTOR. Ce composant
 * matérialise enfin la promesse APOGEE §13 ("UI — `<ApogeeMaintenanceDashboard>`").
 *
 * Mission contribution: CHAIN_VIA:sentinel-handlers — sans visibilité, la
 * Loi 4 (maintien de la masse en orbite) ne peut pas être pilotée par le
 * founder. Le dashboard convertit l'exécution mécanique en confiance pilote.
 *
 * Data flow :
 *   tRPC `governance.listRecentSentinels(strategyId)`
 *     → IntentEmission rows filtrées sur les 3 sentinel kinds
 *     → 3 cartes (1 par sentinel) avec last run / status / drift detected
 */

interface SentinelRunSummary {
  intentId: string;
  kind: "MAINTAIN_APOGEE" | "DEFEND_OVERTON" | "EXPAND_TO_ADJACENT_SECTOR";
  status: "PENDING" | "OK" | "FAILED";
  emittedAt: string; // ISO
  completedAt: string | null;
  summary: string | null;
  driftDetected?: boolean;
}

interface ApogeeMaintenanceDashboardProps {
  strategyId: string;
  composite: number; // current ADVERTIS composite — alerts if regressed
  runs: readonly SentinelRunSummary[];
}

const SENTINEL_LABELS: Record<SentinelRunSummary["kind"], { fr: string; gloss: string }> = {
  MAINTAIN_APOGEE: {
    fr: "Maintien d'apogée",
    gloss: "Vérifie chaque mois le ratio évangélistes/total. Alerte si dilution.",
  },
  DEFEND_OVERTON: {
    fr: "Défense Overton",
    gloss: "Scanne chaque semaine les concurrents qui imitent le narratif.",
  },
  EXPAND_TO_ADJACENT_SECTOR: {
    fr: "Expansion sectorielle",
    gloss: "Identifie les secteurs adjacents prêts pour transposition du playbook.",
  },
};

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  const mo = Math.floor(d / 30);
  return `il y a ${mo} mois`;
}

function statusTone(status: SentinelRunSummary["status"]): string {
  if (status === "OK") return "var(--color-success)";
  if (status === "FAILED") return "var(--color-danger)";
  return "var(--color-muted)";
}

export function ApogeeMaintenanceDashboard(props: ApogeeMaintenanceDashboardProps) {
  const { composite, runs } = props;
  const lastByKind = new Map<SentinelRunSummary["kind"], SentinelRunSummary>();
  for (const r of runs) {
    const existing = lastByKind.get(r.kind);
    if (!existing || new Date(r.emittedAt) > new Date(existing.emittedAt)) {
      lastByKind.set(r.kind, r);
    }
  }

  const driftCount = runs.filter((r) => r.driftDetected).length;
  const headingTone =
    composite < 80 ? "var(--color-danger)" :
    composite < 90 ? "var(--color-warning)" :
    "var(--color-success)";

  return (
    <section
      aria-labelledby="apogee-maintenance-heading"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-elevated)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 id="apogee-maintenance-heading" style={{ margin: 0 }}>
          Maintien d&rsquo;apogée
        </h2>
        <span style={{ color: headingTone, fontWeight: 600 }} aria-live="polite">
          composite {composite.toFixed(0)} / 200
        </span>
      </header>

      <p style={{ margin: 0, color: "var(--color-muted)" }}>
        Loi 4 — la fenêtre d&rsquo;Overton n&rsquo;est pas acquise. Trois sentinels
        tournent en arrière-plan pour défendre la masse en orbite.
        {driftCount > 0 ? (
          <>
            {" "}
            <strong style={{ color: "var(--color-warning)" }}>
              {driftCount} drift détecté{driftCount > 1 ? "s" : ""}.
            </strong>
          </>
        ) : (
          " Aucun drift détecté sur la dernière fenêtre."
        )}
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        {(Object.keys(SENTINEL_LABELS) as SentinelRunSummary["kind"][]).map((kind) => {
          const last = lastByKind.get(kind);
          const label = SENTINEL_LABELS[kind];
          return (
            <li
              key={kind}
              style={{
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface)",
                border: "1px solid var(--color-border)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{label.fr}</strong>
                <span
                  aria-label={last ? `dernier run ${last.status}` : "pas encore exécuté"}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: last ? statusTone(last.status) : "var(--color-muted)",
                  }}
                />
              </div>
              <small style={{ color: "var(--color-muted)" }}>{label.gloss}</small>
              {last ? (
                <small>
                  Dernier run <time dateTime={last.emittedAt}>{formatRelative(last.emittedAt)}</time>
                  {last.summary ? <> — {last.summary}</> : null}
                </small>
              ) : (
                <small style={{ color: "var(--color-muted)" }}>jamais exécuté</small>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
