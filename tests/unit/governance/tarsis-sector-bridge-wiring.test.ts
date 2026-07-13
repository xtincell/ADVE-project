/**
 * Anti-drift — le pont RSS→axe Overton a un CALLER (ADR-0134 §B6, audit T10).
 *
 * Historique : `bridgeTarsisToSectorIntelligence` (Phase 23 Story 3.4) était
 * codé + testé mais JAMAIS appelé, et la table `Sector` n'avait AUCUN writer —
 * le refresh répondait `SECTOR_NOT_FOUND` à vie. L'axe sectoriel du radar
 * Overton ne pouvait venir que d'un seed manuel.
 *
 * Invariants :
 *   1. le cron external-feeds appelle `refreshSectorsFromRecentDigests` APRÈS
 *      l'ingestion des digests ;
 *   2. l'orchestrateur appelle LE pont (`bridgeTarsisToSectorIntelligence`) —
 *      unique caller runtime de la fonction hors tests ;
 *   3. le provisionneur de registre n'invente JAMAIS de donnée culturelle
 *      (culturalAxis / overtonState / lastObservedAt hors du create) ;
 *   4. idempotence ALREADY_FRESH présente ;
 *   5. le connecteur reste en import dynamique (couture one-way préservée).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

describe("ADR-0134 §B6 — pont RSS→axe Overton câblé", () => {
  const orchestrator = read("src/server/services/seshat/tarsis/sector-refresh.ts");
  const cron = read("src/app/api/cron/external-feeds/route.ts");

  it("le cron external-feeds appelle l'orchestrateur après l'ingestion", () => {
    expect(cron).toContain("refreshSectorsFromRecentDigests");
    const ingestIdx = cron.indexOf("await refreshAllPriorityPairs()");
    const refreshIdx = cron.indexOf("await refreshSectorsFromRecentDigests()");
    expect(ingestIdx).toBeGreaterThan(-1);
    expect(refreshIdx).toBeGreaterThan(ingestIdx);
  });

  it("l'orchestrateur est LE caller du pont Phase 23", () => {
    expect(orchestrator).toContain("bridgeTarsisToSectorIntelligence({");
    // Import dynamique — pas d'arête statique seshat/tarsis → campaign-tracker.
    expect(orchestrator).toContain(
      'await import(\n          "@/server/services/campaign-tracker/signals-culture"',
    );
    expect(
      /^import .*campaign-tracker/m.test(orchestrator),
      "aucun import statique de campaign-tracker depuis seshat/tarsis",
    ).toBe(false);
  });

  it("le registre Sector n'invente jamais de donnée culturelle", () => {
    const provisioner = orchestrator.slice(
      orchestrator.indexOf("export async function ensureSectorRegistryRows"),
      orchestrator.indexOf("export async function refreshSectorsFromRecentDigests"),
    );
    expect(provisioner.includes("culturalAxis")).toBe(false);
    expect(provisioner.includes("overtonState")).toBe(false);
    expect(provisioner.includes("lastObservedAt")).toBe(false);
  });

  it("idempotence ALREADY_FRESH sur lastObservedAt vs dernier digest", () => {
    expect(orchestrator).toContain('reason: "ALREADY_FRESH"');
    expect(orchestrator).toContain("sector.lastObservedAt >= unit.latestDigestAt");
  });

  it("états SKIPPED remontés au rapport du cron (jamais avalés — P22-1)", () => {
    expect(cron).toContain("sectorsRefreshed");
    expect(cron).toContain("sectorsSkipped");
  });
});
