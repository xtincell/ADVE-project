/**
 * Anti-drift CI — Passeport fan v1 (ADR-0158).
 *
 * Verrous :
 *   1. Kind `SESHAT_ISSUE_FAN_PASSPORT` catalogué + SLO (double présence).
 *   2. SINGLE-WRITER des champs passeport : toute écriture `passportToken` /
 *      `fanCode` / `passportIssuedAt` vit dans `services/seshat/fan-passport/`
 *      (la naissance des profils reste `superfan-ingest`, ADR-0126 intact).
 *   3. La page publique ne projette AUCUNE PII privée : pas d'email/téléphone
 *      de tiers, pas de déchiffrement identity-graph.
 *   4. Le format du code fan est distinct et dictable (`FAN-XXXXXX`) et le
 *      service parrainage route les deux familles (LF- compte / FAN- fan).
 *   5. Pull-first : la page passeport n'importe aucun émetteur sortant
 *      (email/notification) — elle rend, elle ne broadcast pas.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import { FAN_CODE_RE, isFanCode, PASSPORT_TOKEN_MIN_LENGTH } from "@/server/services/seshat/fan-passport";

const ROOT = join(__dirname, "../../..");
const SRC = join(ROOT, "src");
const WRITER = "src/server/services/seshat/fan-passport/index.ts";

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(p, acc);
    } else if (/\.tsx?$/.test(entry)) acc.push(p);
  }
  return acc;
}

describe("ADR-0158 — kind + SLO", () => {
  it("SESHAT_ISSUE_FAN_PASSPORT est catalogué (governor SESHAT, sync)", () => {
    const entry = INTENT_KINDS.find((k) => k.kind === "SESHAT_ISSUE_FAN_PASSPORT");
    expect(entry).toBeDefined();
    expect(entry!.governor).toBe("SESHAT");
    expect(entry!.async).toBe(false);
  });

  it("SESHAT_ISSUE_FAN_PASSPORT a un SLO à coût LLM nul (zéro LLM)", () => {
    const slo = INTENT_SLOS.find((s) => s.kind === "SESHAT_ISSUE_FAN_PASSPORT");
    expect(slo).toBeDefined();
    expect(slo!.costP95Usd).toBe(0);
  });
});

describe("ADR-0158 — single-writer des champs passeport (HARD)", () => {
  it("aucune écriture passportToken/fanCode/passportIssuedAt hors fan-passport/", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (rel === WRITER) continue;
      const src = readFileSync(file, "utf8");
      // Écriture = le champ apparaît dans un objet `data:` d'une mutation
      // superfanProfile (update/updateMany/upsert/create). Heuristique stricte :
      // fichier qui mutate superfanProfile ET mentionne un champ passeport.
      const mutates = /superfanProfile\s*\.\s*(update|updateMany|upsert|create|createMany)\s*\(/.test(src);
      const touchesPassportField = /\b(passportToken|fanCode|passportIssuedAt)\s*:/.test(src);
      if (mutates && touchesPassportField) offenders.push(rel);
    }
    expect(offenders, `Écriture des champs passeport hors single-writer : ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("ADR-0158 — page publique sans PII privée, pull-first", () => {
  const PAGE = join(ROOT, "src/app/(public)/passeport/[token]/page.tsx");

  it("la page existe", () => {
    expect(existsSync(PAGE)).toBe(true);
  });

  it("ne touche ni email/téléphone de tiers ni déchiffrement identity-graph", () => {
    const src = readFileSync(PAGE, "utf8");
    expect(src).not.toMatch(/refereeEmail|contactEmail|payoutPhone|displayCipher|decrypt/);
    expect(src).not.toMatch(/identity-graph/);
  });

  it("n'importe aucun émetteur sortant (pull-first strict)", () => {
    const src = readFileSync(PAGE, "utf8");
    // Émetteurs = imports de modules d'envoi (email, notifications, CRM) —
    // les mots des commentaires (« ne broadcast rien ») ne comptent pas.
    expect(src).not.toMatch(/from\s+"@\/server\/services\/(email|anubis)/);
    expect(src).not.toMatch(/sendEmail|crmMessage\s*\.\s*create/);
  });

  it("est noindex (lien personnel)", () => {
    const src = readFileSync(PAGE, "utf8");
    expect(src).toMatch(/index:\s*false/);
  });
});

describe("ADR-0158 — codes de parrainage à deux familles", () => {
  it("le format FAN- est distinct de LF- et dictable (sans I/L/O/0/1)", () => {
    expect(isFanCode("FAN-ABC234")).toBe(true);
    expect(isFanCode("LF-ABC234")).toBe(false);
    expect(isFanCode("FAN-ABC10I")).toBe(false); // 1/0/I interdits
    expect(FAN_CODE_RE.source).not.toContain("I");
  });

  it("le service parrainage route les deux familles (LF- compte / FAN- fan)", () => {
    const src = readFileSync(join(ROOT, "src/server/services/referral/index.ts"), "utf8");
    expect(src).toMatch(/\^LF-\[A-Z2-9\]\{6\}\$/);
    expect(src).toMatch(/\^FAN-\[A-Z2-9\]\{6\}\$/);
    expect(src).toMatch(/referrerProfileId/);
  });

  it("la conversion fan franchit RECOMMENDED par la voie gouvernée (jamais un write direct)", () => {
    const src = readFileSync(join(ROOT, "src/server/services/referral/index.ts"), "utf8");
    expect(src).toMatch(/emitIntentTyped/);
    expect(src).toMatch(/SESHAT_REGISTER_SUPERFAN/);
    expect(src).toMatch(/RECOMMENDED/);
    // Aucun upsert direct de SuperfanProfile depuis le service parrainage.
    expect(src).not.toMatch(/superfanProfile\s*\.\s*(upsert|create|update)\s*\(/);
  });

  it("le token passeport a une longueur minimale anti-bruteforce", () => {
    expect(PASSPORT_TOKEN_MIN_LENGTH).toBeGreaterThanOrEqual(16);
  });
});
