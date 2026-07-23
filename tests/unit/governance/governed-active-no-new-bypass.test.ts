/**
 * HARD — AUCUN routeur ne peut ajouter de mutation NON gouvernée en silence
 * (B1, audit adversarial 2026-07-22 ; étendu à TOUS les routeurs round-8).
 *
 * ROUND-8 (§B) : le gate `if (!src.includes("lafusee:governed-active")) continue`
 * exemptait 18 routeurs NON tagués (`payment`, `auth`, `newsletter`, `blog`,
 * `error-vault`, `prod-ops`…) qui portaient `.mutation(` sans AUCUN signal CI —
 * une mutation métier ungoverned pouvait y apparaître silencieusement. Le gate est
 * RETIRÉ : tous les routeurs sont scannés, le baseline gèle l'inventaire complet.
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
 * # Nature du BASELINE (dette Q3 tracée, 78 au 2026-07-22 → 66 au 2026-07-23 après B1 notoria)
 *
 * Deux familles :
 *   • EXEMPT (légitimement non gouverné, ne bougera pas) — infra credential
 *     (`brand-mcp`), infra facturation adminProcedure auto-auditée (`mcp-billing`),
 *     webhook externe signé (`mobile-money`), cache (`brand-node`), preview/
 *     dry-run (`market-study-ingestion.preview`, `ingestion.previewBrandBook`),
 *     re-projection déterministe (`campaign-tracker.reportFieldProgress`).
 *   • PENDING (vraies mutations métier à migrer vers governedProcedure) —
 *     `campaign-manager` (18), `pillar` (10) restants ; `notoria` (12) ✅ MIGRÉ
 *     (v6.27.307, B1) : chantier « migration governedProcedure des 3 routeurs
 *     Neteru cœur » en cours (cf. RESIDUAL-DEBT §B1). Les petits routeurs
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
  // notoria.ts — CLOS (v6.27.307, B1) : les 12 mutations migrées vers governedProcedure
  //   (requireOperator:true préserve le gate opérateur + ADR-0175 ajoute le brand-scope).
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
  "mobile-money.ts": 1, // EXEMPT — webhook externe (secret partagé fail-closed round-8)
  "monetization.ts": 1, // PENDING — initSubscription (public paywall)
  "strategy.ts": 1, // PENDING — validateSynthesis
  // ── Round-8 (§B) : routeurs NON tagués `governed-active`, désormais scannés ──
  "payment.ts": 8, // EXEMPT — infra paiement (paywall public + admin) + audit IntakePayment/Subscription propre (ADR-0092)
  "newsletter.ts": 7, // MIXTE — 3 emailProvider* EXEMPT (vault ADR-0021) + 4 PENDING (subscribers*/newsletters* → spine, plan round-7 ; kind async NEWSLETTER_SEND_CAMPAIGN déjà déclaré, à câbler)
  "auth.ts": 6, // EXEMPT — auth (register/forgot/reset public) + self-prefs (pas de binding opérateur pré-auth)
  "blog.ts": 3, // EXEMPT — CMS éditorial operatorProcedure (doctrine « comme le router CRM », classe editorial.ts)
  "error-vault.ts": 3, // EXEMPT — capture télémétrie + admin markResolved sur le log d'erreurs interne
  "phase18-residuals.ts": 3, // EXEMPT — formulaire de gouvernance adminProcedure (métadonnées)
  "prod-ops.ts": 3, // EXEMPT — infra ops adminProcedure (Coolify deploy / cron / prod-finish)
  "referral.ts": 2, // EXEMPT — file de récompense opérateur adminProcedure (ADR-0157)
  "scoreur.ts": 2, // EXEMPT — seedCanon (seed admin) + previewBrand (dry-run persist:false)
  "footprint.ts": 1, // EXEMPT — scan funnel public, observation Seshat (strategyId:null, télémétrie)
  "xlsx-parser.ts": 1, // EXEMPT — transform pur publicProcedure, zéro effet DB (.mutation pour la sémantique POST)
};

function scanAll(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of readdirSync(ROUTERS_DIR).filter((x) => x.endsWith(".ts"))) {
    const src = readFileSync(join(ROUTERS_DIR, f), "utf8");
    // Round-8 (audit MCP §B) : le gate `governed-active` est RETIRÉ — 18 routeurs
    // NON tagués portaient `.mutation(` sans aucun signal CI. On scanne désormais
    // TOUS les routeurs ; le baseline gèle l'inventaire complet (EXEMPT + PENDING).
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
