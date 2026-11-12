/**
 * src/server/governance/slo-measure.ts — mesure des SLO déclarés (Layer 2, pur).
 *
 * Compare les émissions d'un Intent kind, sur une fenêtre glissante, aux budgets
 * de `slos.ts`, et met en forme la ligne de résumé que lit l'opérateur dans le
 * journal de la tâche planifiée Coolify `slo-check` (`node check-slos.cjs`,
 * toutes les 6 h, dans le conteneur de La Fusée). Aucun accès base ici :
 * `scripts/check-slos.ts` lit `IntentEmission` puis appelle ces fonctions.
 *
 * Unités : `IntentSlo.errorRatePct` est une part (0..1) ; le taux mesuré l'est
 * aussi, et n'est converti en pourcentage qu'à l'affichage.
 */

import type { IntentSlo } from "./slos";

/** 0 mesuré et tenu · 1 au moins un dépassement mesuré · 2 mesure impossible. */
export type SloExitCode = 0 | 1 | 2;

export interface SloEmissionSample {
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly status: string;
  readonly costUsd: number | null;
}

export interface SloMeasurement {
  readonly kind: string;
  readonly sample: number;
  readonly p95LatencyMs: number;
  /** Part des émissions FAILED, 0..1 — même unité que `IntentSlo.errorRatePct`. */
  readonly errorRate: number;
  readonly costP95Usd: number;
  readonly breaches: readonly string[];
}

export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[idx]!;
}

const percent = (share: number) => `${(share * 100).toFixed(2)} %`;

/** Mesure un kind ; `null` si aucune émission dans la fenêtre (rien à juger). */
export function measureSlo(slo: IntentSlo, rows: readonly SloEmissionSample[]): SloMeasurement | null {
  if (rows.length === 0) return null;

  const latencies = rows
    .filter((r) => r.completedAt && r.startedAt)
    .map((r) => r.completedAt!.getTime() - r.startedAt!.getTime())
    .sort((a, b) => a - b);
  const failed = rows.filter((r) => r.status === "FAILED").length;
  const costs = rows
    .filter((r) => r.costUsd !== null)
    .map((r) => r.costUsd!)
    .sort((a, b) => a - b);

  const p95LatencyMs = quantile(latencies, 0.95);
  const errorRate = failed / rows.length;
  const costP95Usd = quantile(costs, 0.95);

  // Un budget nul (latence ou coût à 0) n'est pas contrôlé, comme avant 6.27.585.
  const breaches: string[] = [];
  if (slo.p95LatencyMs && p95LatencyMs > slo.p95LatencyMs) {
    breaches.push(`latence p95 ${p95LatencyMs} ms > ${slo.p95LatencyMs} ms`);
  }
  if (errorRate > slo.errorRatePct) {
    breaches.push(`erreurs ${percent(errorRate)} > ${percent(slo.errorRatePct)}`);
  }
  if (slo.costP95Usd && costP95Usd > slo.costP95Usd) {
    breaches.push(`coût p95 ${costP95Usd.toFixed(4)} $ > ${slo.costP95Usd} $`);
  }

  return { kind: slo.kind, sample: rows.length, p95LatencyMs, errorRate, costP95Usd, breaches };
}

export function sloExitCode(measurements: readonly SloMeasurement[]): 0 | 1 {
  return measurements.some((m) => m.breaches.length > 0) ? 1 : 0;
}

export interface SloSummary {
  readonly at: Date;
  readonly rollingDays: number;
  readonly declared: number;
  readonly measurements: readonly SloMeasurement[];
}

/**
 * Ligne unique, datée, lue dans le journal de la tâche Coolify. Ne contient que
 * des Intent kinds et des nombres : aucune marque, aucun identifiant, aucun secret.
 */
export function formatSloSummary({ at, rollingDays, declared, measurements }: SloSummary): string {
  const breached = measurements.filter((m) => m.breaches.length > 0).length;
  const head = [
    `[check-slos] ${at.toISOString()}`,
    `fenêtre ${rollingDays} j`,
    `déclarés ${declared}`,
    `mesurés ${measurements.length}`,
    `tenus ${measurements.length - breached}`,
    `dépassés ${breached}`,
    `code ${sloExitCode(measurements)}`,
  ].join(" · ");
  const kinds = measurements.map((m) =>
    m.breaches.length > 0
      ? `${m.kind} dépassé (n=${m.sample} ; ${m.breaches.join(" ; ")})`
      : `${m.kind} tenu (n=${m.sample})`,
  );
  return [head, ...kinds].join(" | ");
}

export function formatSloFailure(at: Date, rollingDays: number | string, reason: string): string {
  const head = `[check-slos] ${at.toISOString()}`;
  return [head, `fenêtre ${rollingDays} j`, "mesure impossible", "code 2", reason].join(" · ");
}

/**
 * Raison lisible d'une mesure impossible, sur une ligne, sans secret : toute URL
 * porteuse d'identifiants (`postgresql://user:pass@hôte`) est masquée. Une erreur
 * Prisma (« Invalid `…` invocation », puis un extrait du code) ne garde que sa
 * dernière ligne, qui porte la cause.
 */
export function describeMeasureFailure(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : undefined;
  const lines = (err instanceof Error ? err.message : String(err))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const text = /^Invalid `.*` invocation/.test(lines[0] ?? "") ? lines[lines.length - 1]! : lines.join(" ");
  const message = text
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s@/]*@/gi, "$1***@")
    .replace(/\s+/g, " ")
    .slice(0, 300);
  return code && !message.includes(code) ? `${message} (${code})` : message || "erreur sans message";
}
