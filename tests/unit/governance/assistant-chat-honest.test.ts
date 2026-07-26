/**
 * ADR-0179/0180/0181 — chat Assistant cockpit : verrous anti-régression (HARD).
 *
 * Le chat a été cassé pendant des semaines par un mismatch de protocole de
 * stream (client v3/v4 `0:"…"` vs route texte brut) + un appel provider direct
 * sans parité Sonnet 5 ni pre-flight. Ces verrous scannent la source pour que
 * la classe entière ne revienne pas.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSrc = readFileSync(join(process.cwd(), "src/app/api/chat/route.ts"), "utf8");
const pageSrc = readFileSync(
  join(process.cwd(), "src/app/(cockpit)/cockpit/mestor/page.tsx"),
  "utf8",
);

describe("ADR-0179 — /api/chat passe par le Gateway (plus jamais un provider direct)", () => {
  it("aucun import SDK provider ni streamText direct dans la route", () => {
    expect(routeSrc).not.toMatch(/from ["']@ai-sdk\//);
    expect(routeSrc).not.toMatch(/from ["']ai["']/);
    expect(routeSrc).not.toContain("streamText(");
  });

  it("le chat est servi par le conseil de marque (askCouncilStream)", () => {
    expect(routeSrc).toContain("askCouncilStream(");
  });

  it("pre-flight isTextLLMAvailable AVANT tout header de stream (pattern intake PR #447)", () => {
    expect(routeSrc).toContain("isTextLLMAvailable()");
    // Le pre-flight doit apparaître AVANT la construction de la Response stream.
    expect(routeSrc.indexOf("isTextLLMAvailable()")).toBeLessThan(
      routeSrc.indexOf("textStream.pipeThrough"),
    );
  });

  it("rate-limit par utilisateur branché (store partagé ADR-0161)", () => {
    expect(routeSrc).toContain("consumeAssistantBudget(");
  });

  it("plus de cap hardcodé 2048 hors gateway ni de modèle en dur", () => {
    expect(routeSrc).not.toContain("maxOutputTokens: 2048");
    expect(routeSrc).not.toMatch(/anthropic\(["']claude/);
  });
});

describe("ADR-0181 — historique côté serveur", () => {
  it("la route charge l'historique depuis AssistantMessage (jamais fourni par le client)", () => {
    expect(routeSrc).toContain("assistantMessage.findMany");
    // Le body v2 ne transporte plus de tableau messages.
    expect(routeSrc).not.toMatch(/body\.messages|input\.messages/);
  });

  it("la route persiste le tour après la fin du flux (best-effort)", () => {
    expect(routeSrc).toContain("assistantMessage.createMany");
  });
});

describe("ADR-0179 — client cockpit : protocole texte brut", () => {
  it("plus AUCUN parsing de préfixe de stream AI SDK", () => {
    expect(pageSrc).not.toContain('startsWith("0:")');
    expect(pageSrc).not.toContain("line.slice(2)");
  });

  it("EmptyState honnête sans marque sélectionnée (fin du skeleton infini)", () => {
    expect(pageSrc).toContain("EmptyState");
    expect(pageSrc).not.toContain("<SkeletonPage />");
  });

  it("statuts d'erreur pré-flux gérés (503 indisponible / 429 rate-limit)", () => {
    expect(pageSrc).toContain("errorMessageFor(");
    expect(pageSrc).toContain("503");
    expect(pageSrc).toContain("429");
  });

  it("historique chargé via assistantHistory + clear branché", () => {
    expect(pageSrc).toContain("assistantHistory.useQuery");
    expect(pageSrc).toContain("assistantClear.useMutation");
  });
});
