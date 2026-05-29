"use client";

/**
 * <OvertonRadar /> — Neteru UI component (P5 / MISSION drift 5).
 *
 * Mission contribution: DIRECT_OVERTON. The founder pilots not only
 * their fusée but their *Overton bend* — this component is the cockpit
 * instrument that makes the bend visible. Without it, the founder hears
 * about Overton in the strategy but never *sees* their brand actively
 * deflecting their sector's cultural axis.
 *
 * # Phase 23 Epic 7 (Stories 7.1 / 7.2 / 7.3 — ADR-0078)
 *
 * The radar is now driven entirely by a typed `ConnectorResult<T>` (Pattern
 * P22-1, `src/domain/connector-result.ts`). There is **no** separate UI-only
 * "is loading" boolean and **no** degraded-state divergence from connector
 * state (UX-DR1) — every visual state maps 1:1 to a `connectorResult.state`
 * branch, exhaustively handled :
 *
 *   - `LIVE`                          → render the radar + dated evidence feed
 *   - `DEFERRED_AWAITING_CREDENTIALS` → honest empty state, founder-facing copy
 *   - `DEGRADED`                      → reason-specific honest cause state
 *
 * Within `LIVE`, per-axis partial state is honoured : a named Tarsis axis with
 * no signal renders its own muted "en attente" cell rather than a fabricated
 * zero (no-magic-fallback, ADR-0046 + Pattern P22-2).
 *
 * ## Why a component-local view-model and not `TarsisSignal`
 *
 * `TarsisSignal` lives in `src/server/services/seshat/tarsis/connector.ts` —
 * a Layer-3 server module that a `"use client"` component cannot import
 * (layering cascade + client/server boundary). The radar therefore consumes a
 * presentational view-model, `OvertonRadarSignal`, composed at the tRPC
 * boundary (Story 7.4 `<OvertonPanel>`) from the sector axis + the Tarsis
 * payload. `ConnectorResult<T>` itself is Layer-0 (`@/domain`) and importable
 * everywhere.
 *
 * ## instance variant (CVA — third DS prohibition)
 *
 *   - `full`   → A2 Split : radar left, dated evidence feed right (UX-DR19).
 *   - `teaser` → compact dashboard version : radar shrinks, top evidence item
 *                becomes the headline. Reflow is driven by `@container`
 *                queries (not viewport) so the same component serves both the
 *                full panel and the dashboard bento without divergence.
 */

import { useId, useMemo, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Radar as RadarIcon, PlugZap, CloudOff, Timer, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectorResult, ConnectorDegradationReason, OvertonRadarSignal } from "@/domain";

export type { OvertonRadarSignal } from "@/domain";

// ── CVA variant (third DS prohibition : no inline ternary layout) ────────────

const overtonRadarVariants = cva(
  "@container rounded-xl border border-border bg-background/60 text-foreground",
  {
    variants: {
      instance: {
        full: "p-5",
        teaser: "p-4 max-w-md",
      },
      density: {
        comfortable: "",
        compact: "",
      },
    },
    defaultVariants: { instance: "full", density: "comfortable" },
  },
);

interface OvertonRadarProps extends VariantProps<typeof overtonRadarVariants> {
  /** Typed pivot signal — drives every visual state (P22-1, no UI-only flags). */
  readonly signal: ConnectorResult<OvertonRadarSignal>;
  readonly instance: "full" | "teaser";
  readonly density?: "comfortable" | "compact";
  readonly className?: string;
}

// ── Founder-facing copy (no internal state strings leak — LEXICON) ───────────

const DEFERRED_COPY = {
  title: "Source signal en attente d'activation",
  description:
    "Le radar Overton s'allume dès que la source de signal sectoriel (Tarsis) est activée pour votre marque. Vos équipes UPgraders s'en chargent.",
} as const;

const DEGRADED_COPY: Record<ConnectorDegradationReason, { title: string; description: string; icon: typeof CloudOff }> = {
  INSUFFICIENT_DATA: {
    title: "Pas encore assez de signal",
    description: "Le secteur n'a pas encore produit assez d'observations pour dessiner un axe fiable. Le radar se précisera avec le temps.",
    icon: Timer,
  },
  VENDOR_OUTAGE: {
    title: "Source temporairement indisponible",
    description: "La source de signal sectoriel ne répond pas pour le moment. La mesure reprend automatiquement dès son retour.",
    icon: CloudOff,
  },
  RATE_LIMITED: {
    title: "Mesure en attente",
    description: "La source de signal est momentanément saturée. Le radar se rafraîchit dès que la fenêtre se rouvre.",
    icon: Timer,
  },
  AUTH_REVOKED: {
    title: "Accès à la source à revérifier",
    description: "L'accès à la source de signal sectoriel doit être reconfiguré. Vos équipes UPgraders en sont notifiées.",
    icon: ShieldAlert,
  },
};

// ── Geometry ─────────────────────────────────────────────────────────────────

function radarSize(instance: "full" | "teaser") {
  return instance === "teaser" ? 200 : 300;
}

// ── Honest empty / degraded state (Story 7.3) ────────────────────────────────
//
// Occupies the same footprint as the populated radar (no layout jump on
// DEFERRED ↔ LIVE). Tone is always info — DEFERRED is *expected*, not an error
// (UX-DR12). Founders cannot configure connectors (FR32) so no operator action.

function HonestState({
  instance,
  icon: Icon,
  title,
  description,
}: {
  instance: "full" | "teaser";
  icon: typeof CloudOff;
  title: string;
  description: string;
}) {
  const minH = instance === "teaser" ? "min-h-[220px]" : "min-h-[340px]";
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/40 px-6 py-10 text-center",
        minH,
      )}
    >
      <div className="rounded-full bg-background/80 p-3 text-foreground-muted">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-foreground-secondary">{description}</p>
    </div>
  );
}

// ── Radar SVG plot (a11y : role=img + offscreen data table) ──────────────────

function RadarPlot({
  signal,
  instance,
  titleId,
  descId,
}: {
  signal: OvertonRadarSignal;
  instance: "full" | "teaser";
  titleId: string;
  descId: string;
}) {
  const size = radarSize(instance);
  const center = size / 2;
  const radius = size * 0.42;

  const allTags = useMemo(() => {
    const set = new Set([...Object.keys(signal.sectorAxis?.tags ?? {}), ...Object.keys(signal.brandTags)]);
    return Array.from(set).slice(0, 8);
  }, [signal.sectorAxis, signal.brandTags]);

  const deflection = useMemo(() => {
    let sumSquares = 0;
    let alignDot = 0;
    let aMag = 0;
    let bMag = 0;
    for (const tag of allTags) {
      const b = signal.brandTags[tag] ?? 0;
      const s = signal.sectorAxis?.tags[tag] ?? 0;
      sumSquares += (b - s) ** 2;
      alignDot += b * s;
      aMag += b * b;
      bMag += s * s;
    }
    return {
      magnitude: Math.sqrt(sumSquares),
      alignment: aMag && bMag ? alignDot / Math.sqrt(aMag * bMag) : 0,
    };
  }, [allTags, signal.brandTags, signal.sectorAxis]);

  if (!signal.sectorAxis || allTags.length === 0) {
    return (
      <HonestState
        instance={instance}
        icon={Timer}
        title={DEGRADED_COPY.INSUFFICIENT_DATA.title}
        description="Aucune donnée sectorielle observée pour l'instant. Le radar se dessine dès les premières observations Tarsis."
      />
    );
  }

  const angle = (i: number) => (i / allTags.length) * 2 * Math.PI - Math.PI / 2;
  const point = (i: number, r: number) => ({
    x: center + Math.cos(angle(i)) * r,
    y: center + Math.sin(angle(i)) * r,
  });
  const polygon = (values: number[]) =>
    values.map((v, i) => { const p = point(i, v * radius); return `${p.x},${p.y}`; }).join(" ");

  const sectorValues = allTags.map((t) => signal.sectorAxis?.tags[t] ?? 0);
  const brandValues = allTags.map((t) => signal.brandTags[t] ?? 0);

  return (
    <figure className="m-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className="mx-auto block max-w-full"
      >
        <title id={titleId}>Radar Overton sectoriel</title>
        <desc id={descId}>
          {`Déflexion ${deflection.magnitude.toFixed(2)}, alignement ${(deflection.alignment * 100).toFixed(0)} %, sur ${allTags.length} axes : ${allTags.join(", ")}.`}
        </desc>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <circle key={r} cx={center} cy={center} r={radius * r} fill="none" stroke="rgb(82 82 91)" strokeWidth={0.5} strokeDasharray="2 3" />
        ))}
        {allTags.map((tag, i) => {
          const p = point(i, radius);
          return (
            <g key={tag}>
              <line x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgb(82 82 91)" strokeWidth={0.5} />
              <text
                x={p.x + Math.cos(angle(i)) * 14}
                y={p.y + Math.sin(angle(i)) * 14}
                textAnchor="middle"
                fontSize={instance === "teaser" ? 8 : 10}
                fill="rgb(161 161 170)"
              >
                {tag}
              </text>
            </g>
          );
        })}
        {/* Sector polygon (background reference) — dashed = "where the sector is". */}
        <polygon points={polygon(sectorValues)} fill="rgb(99 102 241 / 0.18)" stroke="rgb(129 140 248)" strokeWidth={1} strokeDasharray="3 2" />
        {/* Brand polygon (foreground) — solid rocket-red = "where you pull it". */}
        <polygon points={polygon(brandValues)} fill="rgb(225 29 72 / 0.30)" stroke="rgb(244 63 94)" strokeWidth={2} />
      </svg>

      {/* Offscreen text-equivalent data table (UX-DR21 — colour not sole carrier). */}
      <table className="sr-only">
        <caption>Valeurs du radar Overton : position du secteur vs position de la marque par axe.</caption>
        <thead>
          <tr><th scope="col">Axe</th><th scope="col">Secteur</th><th scope="col">Marque</th></tr>
        </thead>
        <tbody>
          {allTags.map((tag, i) => (
            <tr key={tag}><th scope="row">{tag}</th><td>{((sectorValues[i] ?? 0) * 100).toFixed(0)}%</td><td>{((brandValues[i] ?? 0) * 100).toFixed(0)}%</td></tr>
          ))}
        </tbody>
      </table>

      <figcaption className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Alignement</div>
          <div className="font-mono text-foreground">{(deflection.alignment * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Déflexion</div>
          <div className="font-mono text-accent">{deflection.magnitude.toFixed(2)}</div>
        </div>
      </figcaption>
    </figure>
  );
}

// ── Per-axis metric cell — honest partial state (Story 7.3) ──────────────────

function MetricCell({ label, value, suffix }: { label: string; value: number | undefined; suffix?: string }) {
  const present = typeof value === "number";
  return (
    <div className="rounded-lg border border-border bg-background/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-foreground-muted">{label}</div>
      {present ? (
        <div className="mt-0.5 font-mono text-sm text-foreground">{value!.toFixed(suffix === "%" ? 0 : 2)}{suffix}</div>
      ) : (
        <div className="mt-0.5 text-xs italic text-foreground-secondary">en attente</div>
      )}
    </div>
  );
}

// ── Dated evidence feed (Story 7.2 — right column of the A2 split) ────────────

function EvidenceFeed({ signal, instance }: { signal: OvertonRadarSignal; instance: "full" | "teaser" }) {
  const claims = signal.claimImitations ?? [];
  const press = signal.unpaidPress ?? [];
  const topItem = claims[0] ?? null;

  if (instance === "teaser") {
    return (
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <MetricCell label="Reprise de vocab." value={signal.vocabularyOverlap !== undefined ? signal.vocabularyOverlap * 100 : undefined} suffix="%" />
          <MetricCell label="Δ embedding" value={signal.embeddingDelta} />
        </div>
        {topItem && (
          <p className="rounded-lg border border-border bg-background/40 p-2 text-xs text-foreground-secondary">
            <span className="font-medium text-foreground">Un concurrent a repris votre langage</span>
            {" — "}
            <span className="italic">« {topItem.phrase} »</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricCell label="Reprise de vocab." value={signal.vocabularyOverlap !== undefined ? signal.vocabularyOverlap * 100 : undefined} suffix="%" />
        <MetricCell label="Δ embedding" value={signal.embeddingDelta} />
      </div>

      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Imitations datées</div>
        {claims.length === 0 ? (
          <p className="text-xs italic text-foreground-secondary">Aucune imitation détectée sur la fenêtre.</p>
        ) : (
          <ol className="space-y-1.5">
            {claims.slice(0, 5).map((c) => (
              <li key={`${c.competitorId}-${c.observedAt}`} className="text-xs text-foreground-secondary">
                <time dateTime={c.observedAt} className="mr-1.5 font-mono text-[10px] text-foreground-muted">
                  {new Date(c.observedAt).toLocaleDateString()}
                </time>
                <span className="italic text-foreground">« {c.phrase} »</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Presse non payée</div>
        {press.length === 0 ? (
          <p className="text-xs italic text-foreground-secondary">Aucune mention presse organique sur la fenêtre.</p>
        ) : (
          <ul className="space-y-1.5">
            {press.slice(0, 4).map((p) => (
              <li key={`${p.publication}-${p.publishedAt}`} className="text-xs text-foreground-secondary">
                <time dateTime={p.publishedAt} className="mr-1.5 font-mono text-[10px] text-foreground-muted">
                  {new Date(p.publishedAt).toLocaleDateString()}
                </time>
                <span className="font-medium text-foreground">{p.publication}</span>
                {" — "}{p.headline}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function OvertonRadar({ signal, instance, density, className }: OvertonRadarProps) {
  // P22-1 invariant 1 : exhaustive state handling — no default/else fall-through.
  let body: ReactNode;
  const titleId = useId();
  const descId = useId();

  switch (signal.state) {
    case "DEFERRED_AWAITING_CREDENTIALS":
      body = <HonestState instance={instance} icon={PlugZap} title={DEFERRED_COPY.title} description={DEFERRED_COPY.description} />;
      break;
    case "DEGRADED": {
      const copy = DEGRADED_COPY[signal.reason];
      body = <HonestState instance={instance} icon={copy.icon} title={copy.title} description={copy.description} />;
      break;
    }
    case "LIVE": {
      const data = signal.data;
      body =
        instance === "full" ? (
          <div className="grid grid-cols-1 gap-5 @md:grid-cols-2">
            <RadarPlot signal={data} instance={instance} titleId={titleId} descId={descId} />
            <EvidenceFeed signal={data} instance={instance} />
          </div>
        ) : (
          <div>
            <RadarPlot signal={data} instance={instance} titleId={titleId} descId={descId} />
            <EvidenceFeed signal={data} instance={instance} />
          </div>
        );
      break;
    }
  }

  const observedAt = signal.state === "LIVE" ? signal.observedAt : signal.state === "DEGRADED" ? signal.lastObservedAt : undefined;
  const mocked = signal.state === "LIVE" && signal.data.mocked;

  return (
    <section className={cn(overtonRadarVariants({ instance, density }), className)} aria-label="Radar Overton sectoriel">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-foreground">
          <RadarIcon className="h-4 w-4 text-foreground-muted" aria-hidden />
          Overton sectoriel
        </h3>
        <div className="text-[10px] uppercase tracking-wider text-foreground-muted">
          {mocked ? "Démo" : observedAt ? `Tarsis · ${new Date(observedAt).toLocaleDateString()}` : "—"}
        </div>
      </header>
      {body}
    </section>
  );
}
