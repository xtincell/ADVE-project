/**
 * Mesure des SLO (6.27.585) — `check-slos.cjs` tourne désormais dans le conteneur
 * de production, lancé par la tâche planifiée Coolify `slo-check`.
 *
 * Deux défauts de l'ancien script, jamais visibles tant que GitHub ne joignait
 * pas la base, sont verrouillés ici :
 *  - les budgets étaient relus dans `slos.ts` par expression régulière, qui lisait
 *    `25_000` comme 25 ms (547 latences sur 635) et sautait les kinds à chiffre ;
 *  - `errorRatePct` est une part (0..1), comparée à un taux en pourcentage.
 */
import { describe, expect, it } from "vitest";
import { build } from "esbuild";
import { INTENT_SLOS, SLO_BY_KIND } from "@/server/governance/slos";
import {
  describeMeasureFailure,
  formatSloFailure,
  formatSloSummary,
  measureSlo,
  sloExitCode,
  type SloEmissionSample,
} from "@/server/governance/slo-measure";

const AT = new Date("2026-11-12T18:00:00.000Z");

function rows(count: number, latencyMs: number, opts: { failed?: number; costUsd?: number | null } = {}) {
  const start = new Date("2026-11-10T08:00:00.000Z");
  return Array.from({ length: count }, (_, i): SloEmissionSample => ({
    startedAt: start,
    completedAt: new Date(start.getTime() + latencyMs),
    status: i < (opts.failed ?? 0) ? "FAILED" : "OK",
    costUsd: opts.costUsd ?? null,
  }));
}

const fillAdve = SLO_BY_KIND.get("FILL_ADVE")!; // 25 000 ms, 3 % d'erreurs, 0,25 $

describe("measureSlo", () => {
  it("rien à juger sans émission dans la fenêtre", () => {
    expect(measureSlo(fillAdve, [])).toBeNull();
  });

  it("lit le budget de latence en millisecondes (25_000 ms, pas 25 ms)", () => {
    expect(measureSlo(fillAdve, rows(20, 20_000))!.breaches).toEqual([]);
    expect(measureSlo(fillAdve, rows(20, 30_000))!.breaches).toEqual(["latence p95 30000 ms > 25000 ms"]);
  });

  it("compare le taux d'erreur à la part déclarée (0..1)", () => {
    const held = measureSlo(fillAdve, rows(100, 1_000, { failed: 2 }))!;
    expect(held.errorRate).toBe(0.02);
    expect(held.breaches).toEqual([]);

    const breached = measureSlo(fillAdve, rows(100, 1_000, { failed: 5 }))!;
    expect(breached.breaches).toEqual(["erreurs 5.00 % > 3.00 %"]);
  });

  it("contrôle le coût p95 seulement quand un budget non nul est déclaré", () => {
    expect(measureSlo(fillAdve, rows(10, 1_000, { costUsd: 0.4 }))!.breaches).toEqual([
      "coût p95 0.4000 $ > 0.25 $",
    ]);
    const free = SLO_BY_KIND.get("OPERATOR_ARCHIVE_STRATEGY")!;
    expect(free.costP95Usd).toBe(0);
    expect(measureSlo(free, rows(10, 100, { costUsd: 0.4 }))!.breaches).toEqual([]);
  });

  it("chaque budget déclaré est une part d'erreurs et une latence en millisecondes", () => {
    for (const slo of INTENT_SLOS) {
      expect(slo.errorRatePct, slo.kind).toBeGreaterThan(0);
      expect(slo.errorRatePct, slo.kind).toBeLessThan(1);
      expect(slo.p95LatencyMs, slo.kind).toBeGreaterThanOrEqual(100);
    }
  });
});

describe("ligne de résumé de la tâche Coolify", () => {
  it("une ligne datée : chaque SLO mesuré, tenu ou dépassé, et le code de sortie", () => {
    const measurements = [
      measureSlo(fillAdve, rows(40, 20_000))!,
      measureSlo(SLO_BY_KIND.get("RUN_RTIS_CASCADE")!, rows(3, 52_000))!,
    ];
    const line = formatSloSummary({ at: AT, rollingDays: 7, declared: INTENT_SLOS.length, measurements });
    expect(line).not.toContain("\n");
    expect(line).toBe(
      `[check-slos] 2026-11-12T18:00:00.000Z · fenêtre 7 j · déclarés ${INTENT_SLOS.length} · mesurés 2 · tenus 1 · dépassés 1 · code 1` +
        " | FILL_ADVE tenu (n=40) | RUN_RTIS_CASCADE dépassé (n=3 ; latence p95 52000 ms > 45000 ms)",
    );
    expect(sloExitCode(measurements)).toBe(1);
  });

  it("sans émission mesurée : tenu, code 0", () => {
    const line = formatSloSummary({ at: AT, rollingDays: 7, declared: 3, measurements: [] });
    expect(line).toBe("[check-slos] 2026-11-12T18:00:00.000Z · fenêtre 7 j · déclarés 3 · mesurés 0 · tenus 0 · dépassés 0 · code 0");
    expect(sloExitCode([])).toBe(0);
  });

  it("mesure impossible : code 2, raison sans identifiants de connexion", () => {
    const err = Object.assign(new Error("connect failed for postgresql://lafusee:s3cr3t@db.internal:5432/lafusee\nretry"), {
      code: "ECONNREFUSED",
    });
    const reason = describeMeasureFailure(err);
    expect(reason).toBe("connect failed for postgresql://***@db.internal:5432/lafusee retry (ECONNREFUSED)");
    expect(formatSloFailure(AT, 7, reason)).toBe(
      `[check-slos] 2026-11-12T18:00:00.000Z · fenêtre 7 j · mesure impossible · code 2 · ${reason}`,
    );
    expect(describeMeasureFailure(new Error("DATABASE_URL absente"))).toBe("DATABASE_URL absente");
  });

  it("erreur Prisma : la cause seule, sans l'extrait de code", () => {
    const err = Object.assign(
      new Error(
        "\nInvalid `client.intentEmission.groupBy()` invocation in\n/app/check-slos.cjs:828:47\n\n  825 }\n→ 828 const emitted = await client.intentEmission.groupBy(\nCan't reach database server at db.internal:5432",
      ),
      { code: "P1001" },
    );
    expect(describeMeasureFailure(err)).toBe("Can't reach database server at db.internal:5432 (P1001)");
  });
});

describe("bundle de l'image", () => {
  it("embarque la table des SLO au lieu de relire src/ sur le disque", async () => {
    const result = await build({
      entryPoints: ["scripts/check-slos.ts"],
      bundle: true,
      platform: "node",
      packages: "external",
      format: "cjs",
      write: false,
      logLevel: "silent",
    });
    const code = result.outputFiles[0]!.text;
    expect(code).not.toContain("readFileSync");
    // Un kind à chiffre, que l'ancienne expression régulière ne voyait pas.
    expect(code).toContain('"LEGACY_STRATEGY_MIGRATE_TO_V4"');
    expect(code).toContain("p95LatencyMs: 25e3");
  }, 60_000);
});
