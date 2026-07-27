/**
 * Anti-drift — la CASCADE RÉELLE de providers du LLM Gateway.
 *
 * Doctrine opérateur (2026-07-16, réaffirmée le 2026-07-27) : **Ollama Cloud est
 * le provider primaire**, OpenRouter le repli, **Anthropic le dernier recours**.
 * Le chemin nominal ne touche aucun crédit payant. `LLM_PREMIUM_MODE=1` inverse
 * (promotion d'Anthropic) ; `LLM_PRIMARY_PROVIDER` gagne sur les deux. OpenAI est
 * volontairement HORS des candidats texte (réservé aux embeddings).
 *
 * ## Ce que ce test remplace
 *
 * Il asseyait une « matrice de routage v5 » (tier S → Opus, A → Sonnet, Ollama en
 * « tier C cheap/on-prem ») portée par `llm-gateway/router.ts` — un module
 * **sans aucun appelant**, dont la doctrine **contredisait** la cascade réelle.
 * Un troisième jeu de règles dormait dans `llm-gateway/router/index.ts`,
 * structurellement inatteignable (occulté par `router.ts` à la résolution de
 * module). Le test était donc doublement trompeur : il certifiait du code mort,
 * et il certifiait la mauvaise doctrine.
 *
 * Pire, il était **vert ou rouge selon l'environnement** : il passait par
 * `routeModel`, qui descendait le catalogue selon les clés présentes sur la
 * machine. Sans clé (CI) il passait ; avec seulement `OPENAI_API_KEY` (local) il
 * échouait sur trois cas. Il protégeait l'absence de clés, pas le routage.
 *
 * Les deux matrices mortes sont retirées (v6.27.338). Ce test garde la fonction
 * qui décide vraiment, et elle est PURE — donc déterministe partout.
 */

import { describe, it, expect } from "vitest";
import {
  _resolveTextProviderOrderForTest as resolveOrder,
  isPremiumMode,
} from "@/server/services/llm-gateway";

const ALL = ["ollama", "anthropic", "openrouter"];

describe("cascade providers — mode nominal (gratuit d'abord)", () => {
  it("Ollama en tête quand il est configuré", () => {
    expect(resolveOrder(ALL, { premium: false })[0]).toBe("ollama");
  });

  it("Anthropic reste le DERNIER recours, jamais promu par défaut", () => {
    const order = resolveOrder(ALL, { premium: false });
    expect(order.indexOf("anthropic")).toBe(order.length - 1);
  });

  it("sans Ollama, OpenRouter prend la tête — pas Anthropic", () => {
    expect(resolveOrder(["anthropic", "openrouter"], { premium: false })[0]).toBe("openrouter");
  });

  it("aucun provider n'est perdu ni dupliqué par la réorganisation", () => {
    const order = resolveOrder(ALL, { premium: false });
    expect([...order].sort()).toEqual([...ALL].sort());
  });
});

describe("cascade providers — mode premium (crédits chargés)", () => {
  it("premium ON → l'ordre structurel est conservé (Anthropic en tête)", () => {
    expect(resolveOrder(["anthropic", "openrouter", "ollama"], { premium: true })[0]).toBe("anthropic");
  });

  it("le défaut du déploiement est NON-premium (pas de crédit payant sans geste explicite)", () => {
    // Lit l'env réel : personne ne doit pouvoir activer le premium par mégarde.
    expect(typeof isPremiumMode()).toBe("boolean");
    if (!process.env.LLM_PREMIUM_MODE) expect(isPremiumMode()).toBe(false);
  });
});

describe("cascade providers — l'opérateur garde la main", () => {
  it("LLM_PRIMARY_PROVIDER explicite gagne sur le défaut ET sur le premium", () => {
    expect(resolveOrder(ALL, { premium: false, explicitPrimary: "anthropic" })[0]).toBe("anthropic");
    expect(resolveOrder(ALL, { premium: true, explicitPrimary: "ollama" })[0]).toBe("ollama");
  });

  it("un primaire explicite absent des candidats est ignoré, pas injecté", () => {
    const order = resolveOrder(["ollama", "openrouter"], { premium: false, explicitPrimary: "anthropic" });
    expect(order).not.toContain("anthropic");
    expect(order[0]).toBe("ollama");
  });
});

describe("aucune matrice de routage concurrente ne renaît", () => {
  it("`llm-gateway/router` ne ré-expose pas de sélecteur de modèle", async () => {
    const mod = await import("@/server/services/llm-gateway/router");
    // Le module est un CATALOGUE d'affichage (page /status), pas un routeur.
    expect(Object.keys(mod)).toEqual(["listAvailableModels"]);
  });
});
