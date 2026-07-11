/**
 * C7 (PROPAGATION-MAP §6b · STATE_FINAL_BLUEPRINT §5.5) — invariants Yggdrasil
 * runtime-vérifiés.
 *
 * Yggdrasil = substrat **ungouverné** de circulation de la valeur ; sa
 * gouvernance repose sur 3 invariants. Jusqu'ici c'était de la doctrine non
 * testée (trou C7). Ce test fige les 3 invariants sur leurs artefacts RÉELS :
 *
 *   Q1 — Traçabilité  : `IntentEmission` hash-chaînée (`prevHash`/`selfHash`)
 *        + `emitIntent` persiste chaque combustion (ADR-0004).
 *   Q2 — Observabilité : boucle Seshat `observeIntent` + `IntentEmission.
 *        observationStatus` (PENDING_OBSERVATION → OBSERVED). NB : la doctrine
 *        nomme « NspEvent » mais le mécanisme runtime EST `observationStatus`
 *        (pas de modèle NspEvent — honnêteté du registre).
 *   Q3 — Non-bypass   : toute mutation passe par `mestor.emitIntent()` ; enforcé
 *        structurellement par la règle ESLint `lafusee/no-direct-service-from-router`.
 *
 * Mode : structural (les artefacts existent → assertions concrètes). Pas de
 * baseline — un invariant qui disparaît fait échouer la CI.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

describe("C7 — Yggdrasil Q1 : traçabilité (IntentEmission hash-chaînée)", () => {
  const schema = read("prisma/schema.prisma");

  it("IntentEmission carries the hash-chain fields (prevHash + selfHash)", () => {
    const model = schema.slice(schema.indexOf("model IntentEmission {"));
    expect(model).toContain("prevHash");
    expect(model).toContain("selfHash");
  });

  it("emitIntent persists an IntentEmission row for every combustion — via le spine hash-chaîné (ADR-0124)", () => {
    const intents = read("src/server/services/mestor/intents.ts");
    expect(intents).toContain("export async function emitIntent");
    // Depuis l'unification ADR-0124, la persistance passe par openEmission
    // (hash-chain + fail-closed) — plus jamais un create nu best-effort.
    expect(intents).toContain("openEmission({");
    expect(intents).toContain("EMISSION_PERSIST_FAILED");
    expect(intents).not.toContain("intentEmission.create");
  });
});

describe("C7 — Yggdrasil Q2 : observabilité (boucle Seshat)", () => {
  it("seshat exposes observeIntent + nextObservationStatus", async () => {
    const observe = await import("@/server/services/seshat/observe");
    expect(typeof observe.observeIntent).toBe("function");
    expect(typeof observe.nextObservationStatus).toBe("function");
  });

  it("nextObservationStatus is deterministic: OK → OBSERVED, else NOT_APPLICABLE", async () => {
    const { nextObservationStatus } = await import("@/server/services/seshat/observe");
    expect(nextObservationStatus("OK", "PENDING_OBSERVATION")).toBe("OBSERVED");
    expect(nextObservationStatus("VETOED", "PENDING_OBSERVATION")).toBe("NOT_APPLICABLE");
  });

  it("IntentEmission carries the observationStatus field (Seshat-driven)", () => {
    const schema = read("prisma/schema.prisma");
    const model = schema.slice(schema.indexOf("model IntentEmission {"));
    expect(model).toContain("observationStatus");
  });
});

describe("C7 — Yggdrasil Q3 : non-bypass (mutations via emitIntent)", () => {
  it("emitIntent is the single governed dispatch entry", () => {
    const intents = read("src/server/services/mestor/intents.ts");
    expect(intents).toContain("export async function emitIntent");
  });

  it("the no-direct-service-from-router ESLint rule structurally enforces non-bypass", () => {
    const ruleIndex = read("eslint-plugin-lafusee/index.js");
    expect(ruleIndex).toContain("no-direct-service-from-router");
    const rule = read("eslint-plugin-lafusee/rules/no-direct-service-from-router.js");
    // The rule forbids router → service imports outside a small whitelist
    // (mestor + pillar-gateway): mutations must traverse mestor.emitIntent.
    expect(rule).toContain("mestor.emitIntent");
    expect(rule).toContain("WHITELIST");
  });
});
