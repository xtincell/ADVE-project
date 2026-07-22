/**
 * Verrou HARD — gardes d'authentification + ownership sur les routes `/api/*`.
 *
 * Classe de fuite prouvée (audit adversarial 2026-07-22, round-3) : les routes
 * `/api/*` de Next NE PASSENT PAS par le middleware d'auth de `proxy.ts` (qui ne
 * couvre que les routes de PAGE `/cockpit|/console|…`). Chaque route API DOIT
 * donc se garder ELLE-MÊME. Étaient ouvertes :
 *   - `/api/chat`         : non authentifiée + chargeait le CONTEXTE CLIENT
 *                           complet d'un `strategyId` deviné dans le prompt LLM.
 *   - `/api/collab/sync`  : lisait/ÉCRASAIT les docs (piliers/oracle/chat) d'une
 *                           autre marque (garde `session?.user` seule).
 *   - `/api/nsp`          : streamait la télémétrie + VETOait des intents d'une
 *                           autre marque, non authentifié.
 *   - `/api/webhooks/social` : injectait des `Signal` FABRIQUÉS sans signature.
 *   - OAuth `state`       : signé avec un fallback PUBLIC si `NEXTAUTH_SECRET`
 *                           manquait (state forgeable en prod).
 *
 * Ce test vérifie que chaque garde reste présente — elle ne peut plus
 * disparaître silencieusement (interdit NEFER n°4 : un trou fermé ne régresse
 * pas en douce). Analyse TEXTUELLE (comme strategy-ownership-guard) : un helper
 * no-op tromperait le scan — la revue reste responsable de la sémantique.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("API route auth + ownership guards (round-3 adversarial)", () => {
  it("/api/chat exige auth() + canAccessStrategy sur le strategyId client", () => {
    const s = src("src/app/api/chat/route.ts");
    expect(s).toMatch(/\bauth\(\)/);
    expect(s).toMatch(/canAccessStrategy\(/);
    expect(s).toMatch(/getOperatorContext\(/);
  });

  it("/api/collab/sync exige auth() + canAccessStrategy (GET + POST)", () => {
    const s = src("src/app/api/collab/sync/route.ts");
    expect(s).toMatch(/\bauth\(\)/);
    // Deux occurrences de la garde d'ownership (une par handler).
    const guards = s.match(/canAccessStrategy\(/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(2);
  });

  it("/api/nsp exige auth() + canAccessStrategy (GET + DELETE via guardIntent)", () => {
    const s = src("src/app/api/nsp/route.ts");
    expect(s).toMatch(/\bauth\(\)/);
    expect(s).toMatch(/canAccessStrategy\(/);
    // Le DELETE ne doit VETOer QUE des intents non-terminaux (pas de clobber).
    expect(s).toMatch(/status:\s*\{\s*in:\s*\[\s*"PENDING",\s*"QUEUED"\s*\]/);
  });

  it("/api/webhooks/social exige une signature HMAC fail-closed", () => {
    const s = src("src/app/api/webhooks/social/route.ts");
    expect(s).toMatch(/verifySocialSignature\(/);
    expect(s).toMatch(/timingSafeEqual/);
    // Fail-closed en prod : pas de secret hardcodé quand NODE_ENV=production.
    expect(s).toMatch(/NODE_ENV\s*===\s*"production"\s*\?\s*undefined/);
    // La signature est vérifiée AVANT tout parse/traitement (rejet 401).
    expect(s).toMatch(/if\s*\(!verifySocialSignature\([^)]*\)\)\s*\{[\s\S]*?status:\s*401/);
  });

  it("OAuth state : clé de signature fail-closed en prod, plus de fallback public dans les routes", () => {
    const helper = src("src/server/services/oauth-integrations/index.ts");
    expect(helper).toMatch(/export function oauthStateSigningKey\(/);
    // Prod : secret manquant ⇒ throw (aucun state forgeable).
    expect(helper).toMatch(/NODE_ENV\s*===\s*"production"/);
    expect(helper).toMatch(/throw new Error\(/);
    // Le fallback dev vit UNIQUEMENT dans ce helper (jamais dans les routes).
    const fallback = /lafusee-dev-fallback-32-chars-minimum/g;
    expect((helper.match(fallback) ?? []).length).toBeGreaterThanOrEqual(1);
    for (const rel of [
      "src/app/api/integrations/oauth/[provider]/start/route.ts",
      "src/app/api/integrations/oauth/[provider]/callback/route.ts",
    ]) {
      const s = src(rel);
      expect(s).toMatch(/oauthStateSigningKey/);
      // La constante publique ne doit plus être hardcodée dans la route.
      expect(s).not.toMatch(fallback);
    }
  });
});
