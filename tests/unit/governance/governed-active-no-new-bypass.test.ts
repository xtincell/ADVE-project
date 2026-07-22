/**
 * HARD — un routeur `lafusee:governed-active` ne peut plus ajouter de mutation
 * NON gouvernée en silence (B1, audit adversarial 2026-07-22).
 *
 * # Le trou que ce test verrouille
 *
 * Q3 (non-bypass) reposait sur DEUX mécaniques faibles : le lint
 * `lafusee/no-direct-service-from-router` (mode `warn`) et un marqueur de
 * fichier `lafusee:governed-active` qui EXEMPTE le routeur SANS vérifier qu'il
 * gouverne vraiment. Le test `yggdrasil-three-invariants` grep-ait sa propre
 * règle (tautologie). Résultat : un routeur pouvait porter le marqueur ET des
 * `.mutation()` en `db.*` direct sans émission.
 *
 * Ce test est le VÉRIFICATEUR réel : pour chaque routeur marqué
 * `governed-active`, il compte les `.mutation()` qui ne sont NI
 * `governedProcedure`, NI `auditedProcedure` (strangler), NI porteuses d'un
 * `emitIntent*`/`openEmission` dans leur corps. Ce compte est gelé par un
 * BASELINE par routeur : il ne peut QUE décroître.
 *   - Ajouter une mutation non gouvernée → compte > baseline → merge cassé
 *     (gouverner, ou justifier en baissant sciemment le baseline).
 *   - Réparer une mutation → compte < baseline → mettre à jour le baseline
 *     (le registre reste honnête et décroissant, motif emission-spine).
 *
 * # Nature du BASELINE (dette Q3 tracée, 78 au 2026-07-22)
 *
 * Deux familles :
 *   • EXEMPT (légitimement non gouverné, ne bougera pas) — infra credential
 *     (`brand-mcp`), infra facturation adminProcedure auto-auditée (`mcp-billing`),
 *     webhook externe signé (`mobile-money`), cache (`brand-node`), preview/
 *     dry-run (`market-study-ingestion.preview`, `ingestion.previewBrandBook`),
 *     re-projection déterministe (`campaign-tracker.reportFieldProgress`).
 *   • PENDING (vraies mutations métier à migrer vers governedProcedure) —
 *     surtout `campaign-manager` (18), `notoria` (12), `pillar` (10) : chantier
 *     dédié « migration governedProcedure des 3 routeurs Neteru cœur » (trop
 *     risqué en une passe — cf. RESIDUAL-DEBT §B1). Les petits routeurs
 *     (`client`, `crm-contacts`, `strategy.validateSynthesis`…) suivront par lots.
 *
 * Mode HARD (exact match) — toute dérive (hausse OU baisse non répercutée) casse.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROUTERS_DIR = join(__dirname, "..", "..", "..", "src/server/trpc/routers");

// Entrées de routeur au niveau supérieur : `  name: <base>` (indent 2 espaces).
const ENTRY_RE =
  /\n {2}(\w+):\s*(governedProcedure|audited[A-Za-z]\w*|protectedProcedure|operatorProcedure|adminProcedure|publicProcedure|strategyScopedProcedure)\b/g;

/** Compte les mutations NON gouvernées d'un routeur governed-active. */
function ungovernedMutationCount(src: string): number {
  const entries = [...src.matchAll(ENTRY_RE)];
  let n = 0;
  for (let i = 0; i < entries.length; i++) {
    const m = entries[i]!;
    const base = m[2]!;
    const block = src.slice(m.index!, i + 1 < entries.length ? entries[i + 1]!.index! : src.length);
    if (!/\.mutation\(/.test(block)) continue;
    // Gouvernée si : governedProcedure, base audited* (strangler), OU le corps
    // émet (emitIntent / emitIntentTyped<…>( / openEmission).
    if (base === "governedProcedure" || base.startsWith("audited")) continue;
    if (/emitIntent|openEmission/.test(block)) continue;
    n++;
  }
  return n;
}

/**
 * BASELINE Q3 — dette de mutations non gouvernées par routeur governed-active
 * (audit 2026-07-22). NE PEUT QUE DÉCROÎTRE. Absent = 0 attendu (aucune dette).
 */
const BASELINE: Readonly<Record<string, number>> = {
  "campaign-manager.ts": 18, // PENDING — chantier migration Neteru cœur
  "notoria.ts": 12, // PENDING — idem
  "pillar.ts": 10, // PENDING — idem (dont rollbackVersion, cf. §G)
  "quick-intake.ts": 8, // mixte : funnel public (conversation-state) + PENDING
  "mcp-billing.ts": 6, // EXEMPT — infra facturation adminProcedure auto-auditée
  "crm-contacts.ts": 4, // PENDING — CRM
  "anubis.ts": 2, // PENDING — templatesUpsert/Delete (le reste émet via emitIntentTyped)
  "argos.ts": 2, // mixte — setVerdict (PENDING) + subscribeNewsletter (public)
  "brand-mcp.ts": 2, // EXEMPT — infra credential MCP (canAccessStrategy-gardé)
  "client.ts": 2, // PENDING — client create/addBrand
  "market-study-ingestion.ts": 2, // EXEMPT — preview (dry-run) + export PDF
  "social.ts": 2, // PENDING — upsertSocialConnector / dismissInboxItem
  "brand-node.ts": 1, // EXEMPT — invalidateInheritanceCache (cache, pas métier)
  "campaign-tracker.ts": 1, // EXEMPT — reportFieldProgress (re-projection)
  "ingestion.ts": 1, // EXEMPT — previewBrandBook (dry-run)
  "market-cost.ts": 1, // PENDING — seedBaseline (admin seed)
  "mission-applications.ts": 1, // PENDING — withdraw
  "mobile-money.ts": 1, // EXEMPT — webhook externe (signature vérifiée)
  "monetization.ts": 1, // PENDING — initSubscription (public paywall)
  "strategy.ts": 1, // PENDING — validateSynthesis
};

function scanAll(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of readdirSync(ROUTERS_DIR).filter((x) => x.endsWith(".ts"))) {
    const src = readFileSync(join(ROUTERS_DIR, f), "utf8");
    if (!src.includes("lafusee:governed-active")) continue;
    const n = ungovernedMutationCount(src);
    if (n > 0) out[f] = n;
  }
  return out;
}

describe("Q3 non-bypass — verrou governed-active (HARD, B1)", () => {
  const actual = scanAll();

  it("aucun routeur governed-active n'AUGMENTE sa dette de mutations non gouvernées", () => {
    const grown: string[] = [];
    for (const [f, n] of Object.entries(actual)) {
      const base = BASELINE[f] ?? 0;
      if (n > base) grown.push(`${f}: ${n} > baseline ${base}`);
    }
    expect(
      grown,
      `Mutation(s) non gouvernée(s) AJOUTÉE(S) dans un routeur governed-active. ` +
        `Gouverne-la (governedProcedure / auditedProcedure / emitIntent) ou, si ` +
        `légitimement exempte, monte le baseline AVEC justification.\n${grown.join("\n")}`,
    ).toEqual([]);
  });

  it("aucune dette réparée n'est laissée périmée dans le baseline (registre décroissant)", () => {
    const stale: string[] = [];
    for (const [f, base] of Object.entries(BASELINE)) {
      const n = actual[f] ?? 0;
      if (n < base) stale.push(`${f}: réel ${n} < baseline ${base} → baisse le baseline`);
    }
    expect(
      stale,
      `Dette Q3 réparée mais baseline non mis à jour (garder le registre honnête ` +
        `et décroissant) :\n${stale.join("\n")}`,
    ).toEqual([]);
  });

  it("aucun nouveau routeur governed-active hors baseline n'apparaît avec de la dette", () => {
    const unknown = Object.keys(actual).filter((f) => !(f in BASELINE));
    expect(
      unknown,
      `Nouveau routeur governed-active avec mutation(s) non gouvernée(s) hors ` +
        `baseline : ${unknown.join(", ")}`,
    ).toEqual([]);
  });
});
