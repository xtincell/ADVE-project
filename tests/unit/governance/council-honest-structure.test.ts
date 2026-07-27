/**
 * Anti-drift — le conseil ne ment pas sur sa propre existence.
 *
 * Incident fondateur (capture opérateur, 2026-07-27). L'utilisateur demande
 * « qui me répond ? les adversarials agents ont donné leur avis ? ». Le
 * coordinateur répond :
 *
 *   « Les "adversarials agents" ne font pas partie de votre dossier SPAWT.
 *     Votre contexte stratégie ne mentionne aucun mécanisme de ce type. »
 *
 * Deux défauts en une phrase : (1) sa persona ignorait qu'elle coordonne un
 * conseil de quatre experts, (2) elle a cherché la réponse dans le DOSSIER de la
 * marque alors que la question portait sur ELLE. Et derrière, un défaut de
 * produit : la délibération n'était atteignable que par une procédure
 * opérateur — les experts existaient sans qu'aucun fondateur ne puisse les
 * convoquer.
 *
 * Ce test verrouille les trois : la persona connaît sa structure, elle sait que
 * les experts ne sont PAS consultés en conversation courante, et la
 * délibération est joignable par le fondateur de sa marque.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { COUNCIL_PERSONAS } from "@/server/services/mestor/council/personas";

const ROOT = join(__dirname, "..", "..", "..");

describe("le coordinateur connaît sa propre structure", () => {
  const prompt = COUNCIL_PERSONAS.coordinator.systemPrompt;

  it("sait qu'il coordonne quatre experts contradictoires", () => {
    expect(prompt).toMatch(/QUATRE experts/i);
    expect(prompt).toMatch(/contradictoire/i);
  });

  it("sait que les experts ne sont PAS consultés en conversation courante", () => {
    expect(prompt).toMatch(/ne sont pas consultés|n'ont pas été consultés/i);
  });

  it("a l'interdiction explicite de nier leur existence", () => {
    // C'est la phrase exacte de l'incident qui est proscrite.
    expect(prompt).toMatch(/ne fait pas partie du dossier|Ne réponds JAMAIS/i);
  });

  it("sait qu'une question sur le conseil ne se cherche pas dans les piliers", () => {
    expect(prompt).toMatch(/porte sur TOI, pas sur le dossier/i);
  });
});

describe("les quatre experts gardent leur mandat adversarial", () => {
  it("chacun porte un mandat de contestation, pas d'approbation", () => {
    for (const id of ["expert-a", "expert-d", "expert-v", "expert-e"] as const) {
      const p = COUNCIL_PERSONAS[id];
      expect(p.pillarKey, `${id} doit être rattaché à un pilier`).toBeTruthy();
      expect(p.systemPrompt).toMatch(/ADVERSARIAL/);
      // Un APPROVE complaisant est explicitement un échec de mandat.
      expect(p.systemPrompt).toMatch(/échec de (ton |son )?mandat/i);
    }
  });

  it("couvre exactement les 4 piliers fondateurs", () => {
    const keys = (["expert-a", "expert-d", "expert-v", "expert-e"] as const).map(
      (id) => COUNCIL_PERSONAS[id].pillarKey,
    );
    expect(keys).toEqual(["a", "d", "v", "e"]);
  });
});

describe("la délibération est atteignable par le fondateur", () => {
  const router = readFileSync(
    join(ROOT, "src", "server", "trpc", "routers", "mestor-router.ts"),
    "utf8",
  );

  it("n'est plus réservée à l'opérateur", () => {
    // Elle était `operatorProcedure` : les experts existaient sans qu'aucun
    // fondateur ne puisse les convoquer.
    expect(router).toMatch(/councilDeliberate:\s*strategyScopedProcedure/);
  });

  it("reste gardée par l'abonnement (6 appels LLM par délibération)", () => {
    const seg = router.slice(router.indexOf("councilDeliberate:"));
    expect(seg.slice(0, 1_500)).toMatch(/checkPaidTier/);
  });

  it("le panneau cockpit distingue une vraie délibération d'un draft seul", () => {
    const panel = readFileSync(
      join(ROOT, "src", "components", "cockpit", "council-deliberation-panel.tsx"),
      "utf8",
    );
    // `deliberated: false` = aucun expert n'a répondu. Présenter ça comme un
    // avis contradictoire serait exactement le mensonge qu'on corrige.
    expect(panel).toMatch(/!d\.deliberated/);
    expect(panel).toMatch(/pas un avis contradictoire/i);
    // Les désaccords non résolus sont rendus, jamais gommés.
    expect(panel).toMatch(/dissent/);
  });
});
