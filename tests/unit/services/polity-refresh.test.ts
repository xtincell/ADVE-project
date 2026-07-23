/**
 * polity-refresh (ADR-0127) — harvester digest→polity.
 *
 * Deux volets :
 *   1. Comportement PUR de `resolvePolityUnits` (zéro I/O, déterministe) — le
 *      garde anti-fabrication (échelle non déclarée → aucune polity) + la
 *      résolution des coordonnées + l'idempotence de dédup + robustesse sans
 *      digest.
 *   2. Anti-drift SOURCE (miroir de `tarsis-sector-bridge-wiring`) — câblage
 *      cron, écriture GOUVERNÉE via emitIntent (jamais de db.sectorPolityAxis
 *      brut), kind dans l'union + dispatché par le commandant, réutilisation de
 *      la dérivation de signal partagée.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolvePolityUnits,
  type PolityStrategyInput,
} from "@/server/services/seshat/tarsis/polity-refresh";

// ── Volet 1 — comportement pur ────────────────────────────────────────

const DIGEST_AT = new Date("2026-07-23T06:00:00Z");
const digestBySector = new Map([
  // La clé de digest CONTIENT le slug de la stratégie ("fmcg agro" ⊇ "fmcg").
  ["fmcg agro", { latestAt: DIGEST_AT, countryCodes: new Set(["CM"]) }],
]);

const strat = (over: Partial<PolityStrategyInput> = {}): PolityStrategyInput => ({
  sectorSlug: "fmcg",
  marketScale: "NATION",
  countryCode: "CM",
  ...over,
});

describe("resolvePolityUnits — coordonnées + anti-fabrication", () => {
  it("(a) échelle DÉCLARÉE → une polity aux bonnes coordonnées", () => {
    const units = resolvePolityUnits({ digestBySector, strategies: [strat()] });
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ sectorSlug: "fmcg", marketScale: "NATION", countryCode: "CM" });
    expect(units[0]!.latestDigestAt).toEqual(DIGEST_AT);
  });

  it("(b) échelle NULL → AUCUNE row polity (anti-fabrication, jamais défautée)", () => {
    const units = resolvePolityUnits({
      digestBySector,
      strategies: [strat({ marketScale: null })],
    });
    expect(units).toHaveLength(0);
  });

  it("(c) aucun digest / aucune stratégie → [] (pas de crash)", () => {
    expect(resolvePolityUnits({ digestBySector: new Map(), strategies: [strat()] })).toEqual([]);
    expect(resolvePolityUnits({ digestBySector, strategies: [] })).toEqual([]);
  });

  it("pays non déclaré → axe supra-national (countryCode \"\")", () => {
    const units = resolvePolityUnits({
      digestBySector,
      strategies: [strat({ countryCode: null })],
    });
    expect(units).toHaveLength(1);
    expect(units[0]!.countryCode).toBe("");
  });

  it("secteur non couvert par un digest → aucune polity", () => {
    const units = resolvePolityUnits({
      digestBySector,
      strategies: [strat({ sectorSlug: "tech" })],
    });
    expect(units).toHaveLength(0);
  });

  it("dédup : deux stratégies même (secteur×échelle×pays) → une seule polity", () => {
    const older = new Map([["fmcg agro", { latestAt: new Date("2026-07-20T06:00:00Z"), countryCodes: new Set(["CM"]) }]]);
    const merged = new Map([
      ...older,
      ["fmcg boissons", { latestAt: DIGEST_AT, countryCodes: new Set(["CM"]) }],
    ]);
    const units = resolvePolityUnits({
      digestBySector: merged,
      strategies: [strat(), strat()],
    });
    expect(units).toHaveLength(1);
    // Le digest le plus récent qui COUVRE le slug l'emporte (idempotence).
    expect(units[0]!.latestDigestAt).toEqual(DIGEST_AT);
  });

  it("polities distinctes : deux échelles du même secteur → deux rows", () => {
    const units = resolvePolityUnits({
      digestBySector,
      strategies: [strat({ marketScale: "NATION" }), strat({ marketScale: "QUARTIER" })],
    });
    expect(units).toHaveLength(2);
    expect(new Set(units.map((u) => u.marketScale))).toEqual(new Set(["NATION", "QUARTIER"]));
  });
});

// ── Volet 2 — anti-drift source (miroir tarsis-sector-bridge-wiring) ───

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

describe("ADR-0127 — harvester polity câblé & gouverné", () => {
  const harvester = read("src/server/services/seshat/tarsis/polity-refresh.ts");
  const cron = read("src/app/api/cron/external-feeds/route.ts");
  const commandant = read("src/server/services/artemis/commandant.ts");
  const intents = read("src/server/services/mestor/intents.ts");

  it("le cron appelle le harvester polity APRÈS le sector harvester", () => {
    const sectorIdx = cron.indexOf("await refreshSectorsFromRecentDigests()");
    const polityIdx = cron.indexOf("await refreshPolityAxesFromRecentDigests()");
    expect(sectorIdx).toBeGreaterThan(-1);
    expect(polityIdx).toBeGreaterThan(sectorIdx);
    expect(cron).toContain("polityAxesRefreshed");
    expect(cron).toContain("polityAxesSkipped");
  });

  it("écriture GOUVERNÉE via emitIntent — JAMAIS un db.sectorPolityAxis brut", () => {
    expect(harvester).toContain('kind: "SESHAT_UPSERT_POLITY_AXIS"');
    expect(harvester).toContain("emitIntent(");
    // Anti-doublon d'écriture : aucune écriture brute de SectorPolityAxis dans
    // le CODE (le findUnique d'idempotence est une LECTURE, autorisée). On scanne
    // le source HORS commentaires — le header cite légitimement le pattern interdit
    // pour l'expliquer, ce qui déclencherait un faux positif sur un scan brut.
    const code = harvester
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code.includes("db.sectorPolityAxis.upsert")).toBe(false);
    expect(code.includes("db.sectorPolityAxis.create")).toBe(false);
    expect(code.includes("db.sectorPolityAxis.update")).toBe(false);
  });

  it("kind dans l'union Intent ET dispatché par le commandant vers le writer unique", () => {
    expect(intents).toContain('kind: "SESHAT_UPSERT_POLITY_AXIS"');
    expect(commandant).toContain('case "SESHAT_UPSERT_POLITY_AXIS"');
    expect(commandant).toContain("upsertPolityAxis({");
  });

  it("garde anti-fabrication présent : échelle non déclarée → SKIP", () => {
    expect(harvester).toContain("if (!s.marketScale) continue;");
  });

  it("réutilise la dérivation de signal partagée (pas de computation dupliquée)", () => {
    expect(harvester).toContain("fetchSectorSignal(");
    expect(harvester).toContain("tarsisSignalToLegacySignals(");
    expect(harvester).toContain("extractSectorSlug(");
    expect(harvester).toContain("loadRecentDigestsBySector(");
  });

  it("idempotence ALREADY_FRESH + dégradation honnête (pas de signal LIVE → pas de row)", () => {
    expect(harvester).toContain('reason: "ALREADY_FRESH"');
    expect(harvester).toContain('reason: "DEGRADED_INPUT"');
    expect(harvester).toContain('signal.state !== "LIVE"');
  });
});
