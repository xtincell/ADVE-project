/**
 * ADR-0180 — Conseil de marque : verrous structurels (HARD).
 *
 * 1. Tout appel LLM du conseil passe par le Gateway — jamais un SDK provider
 *    direct (c'est le bypass qui a cassé le chat pendant des semaines).
 * 2. Le contenu de marque injecté est TOUJOURS neutralisé (`wrapUntrusted`).
 * 3. Le conseil est advisory LECTURE SEULE : aucune écriture pilier, aucune
 *    émission d'Intent — il ne touche jamais le circuit de la donnée.
 * 4. Les 5 personas existent avec le mapping pilier exact et le mandat
 *    adversarial explicite.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COUNCIL_DIR = join(process.cwd(), "src/server/services/mestor/council");
const files = readdirSync(COUNCIL_DIR).filter((f) => f.endsWith(".ts"));
const sources = new Map(files.map((f) => [f, readFileSync(join(COUNCIL_DIR, f), "utf8")]));
const allSrc = [...sources.values()].join("\n");

describe("ADR-0180 — le conseil passe par le Gateway, exclusivement", () => {
  it("aucun import SDK provider direct dans council/**", () => {
    expect(allSrc).not.toMatch(/from ["']@ai-sdk\/|import\(["']@ai-sdk\//);
  });

  it("aucun generateText/streamText direct (seuls streamChatText + executeStructuredLLMCall)", () => {
    expect(allSrc).not.toMatch(/\bgenerateText\(/);
    // `streamText(` interdit ; `streamChatText(` (surface Gateway) autorisé.
    expect(allSrc.replace(/streamChatText\(/g, "")).not.toMatch(/\bstreamText\(/);
    expect(allSrc).toContain("streamChatText(");
    expect(allSrc).toContain("executeStructuredLLMCall(");
  });

  it("les sorties structurées portent un schéma Zod (ADR-0067)", () => {
    const schemas = sources.get("schemas.ts")!;
    expect(schemas).toContain("councilDraftSchema");
    expect(schemas).toContain("expertCritiqueSchema");
    expect(schemas).toContain("councilSynthesisSchema");
  });
});

describe("ADR-0180 — contenu de marque neutralisé", () => {
  it("context.ts passe chaque bloc par wrapUntrusted", () => {
    expect(sources.get("context.ts")!).toContain("wrapUntrusted(");
  });

  it("le system prompt du conseil embarque UNTRUSTED_NOTICE", () => {
    expect(sources.get("index.ts")!).toContain("UNTRUSTED_NOTICE");
  });
});

describe("ADR-0180 — advisory lecture seule (jamais le circuit d'écriture)", () => {
  it("aucune écriture pilier ni émission d'Intent dans council/**", () => {
    expect(allSrc).not.toMatch(/writePillar|db\.pillar\.(update|create|upsert|delete)/);
    expect(allSrc).not.toMatch(/emitIntent|openEmission/);
  });

  it("aucune écriture d'entité métier (seules AssistantThread/Message + rate-limit autorisées ailleurs)", () => {
    // council/** ne doit contenir AUCUN create/update Prisma hors le rate-limit
    // (scanRateHit.create, store partagé ADR-0161).
    const writes = allSrc.match(/db\.\w+\.(create|update|upsert|delete)\w*\(/g) ?? [];
    const allowed = writes.filter((w) => w.startsWith("db.scanRateHit.create"));
    expect(writes).toEqual(allowed);
  });
});

describe("ADR-0180 — les 5 personas, mapping exact, mandat adversarial", () => {
  const personas = sources.get("personas.ts")!;

  it("5 personas : coordinator + experts a/d/v/e", () => {
    for (const id of ["coordinator", "expert-a", "expert-d", "expert-v", "expert-e"]) {
      expect(personas).toContain(`"${id}"`);
    }
  });

  it("chaque expert est mappé à SON pilier fondateur", () => {
    expect(personas).toMatch(/expert-a[\s\S]{0,200}pillarKey: "a"/);
    expect(personas).toMatch(/expert-d[\s\S]{0,200}pillarKey: "d"/);
    expect(personas).toMatch(/expert-v[\s\S]{0,200}pillarKey: "v"/);
    expect(personas).toMatch(/expert-e[\s\S]{0,200}pillarKey: "e"/);
  });

  it("le coordinateur n'a PAS de pillarKey (il voit les 8)", () => {
    const coordBlock = personas.slice(
      personas.indexOf("coordinator: {"),
      personas.indexOf('"expert-a": {'),
    );
    expect(coordBlock).not.toContain("pillarKey:");
  });

  it("le mandat adversarial est explicite (CHALLENGER + APPROVE-sans-critique = échec)", () => {
    expect(personas).toContain("CHALLENGER");
    expect(personas).toContain("échec de ton mandat");
  });

  it("anti-fabrication : les personas interdisent d'inventer chiffres/données", () => {
    expect(personas).toMatch(/ne fabriques JAMAIS|jamais un chiffre inventé/i);
  });
});
