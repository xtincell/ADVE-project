/**
 * Verrou PROACTIF — IDOR par id d'ENTITÉ (round-10, scan-entity-idor).
 *
 * Pourquoi ce test existe (et pourquoi il est PROACTIF, pas une allowlist de
 * gardes connues) : la classe « procédure keyée sur un id d'ENTITÉ non gardée »
 * a survécu aux rounds 4→9 parce que le scanner d'ownership historique
 * (`strategy-ownership-guard`) et la garde ADR-0175 de `governedProcedure` ne
 * réagissent qu'au token littéral `strategyId` de TÊTE. Tout `{ id }`,
 * `driverId`, `talentProfileId`, `deliverableId` — ou un strategyId NOMMÉ `id` —
 * leur est INVISIBLE. Énumérer « ce qui est gardé » ne trouve jamais « ce qui ne
 * l'est pas ».
 *
 * Ce test INVERSE la logique : il ÉNUMÈRE l'univers des procédures
 * founder-atteignables keyées sur un id d'entité, puis PROUVE que chacune est
 * soit gardée (référence un chokepoint / self-scope reconnu), soit inscrite à
 * `SAFE_BY_DESIGN` avec une raison. Une procédure NEUVE non gardée et non
 * allowlistée casse le build — la classe ne peut plus repasser en silence.
 *
 * L'allowlist a été établie par 4 sous-agents adversariaux (round-10) qui ont lu
 * chaque handler : global-catalog, self-scope en service, provenance JSON jamais
 * déréférencée, where-scope co-localisé, résolution en mémoire d'un plan
 * strategy-scopé. Clé = `fichier.ts:procName`, insensible aux décalages de ligne.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROUTERS = join(process.cwd(), "src/server/trpc/routers");

// Chokepoints d'ownership reconnus (round-4→10). Un helper no-op tromperait le
// scan — la revue reste responsable de la sémantique (comme les autres verrous).
const CHOKEPOINT =
  /assert\w*Access|assert\w*Read|assertStrategy|canAccess\w+|enforce\w+Access|enforce\w+RawScope|accessibleStrategyIds|scopeStrategies\(|scopeCampaigns\(|scopeClients\(|scopeMcp|assertNodeAccess|assertProposalAccess|assertContractAccess|assertConversationAccess|assertQcParticipant|assertSignalStrategyAccess|assertTalentProfileAccess|assertDriverAccess|assertSourceAccess|assertIntakeAccess|assertProcessAccess|assertMissionAccess|assertLinkedEntitySameStrategy|assertArbiter|commissionScope|resolveOperatorId|assertRawStrategyScope|isStaff\(/;
const SELF_SCOPE =
  /userId\s*[!=]==?\s*ctx\.session\.user\.id|ctx\.session\.user\.id\s*[!=]==?\s*\w+\.userId|\.userId !== ctx\.session|\.operatorId !== ctx\.session\.user\.id|where:\s*\{\s*[^}]*userId:\s*ctx\.session\.user\.id|userId:\s*ctx\.session\.user\.id|applicantId|payoutPhone: true|_id: \{ [^}]*campaignId|campaignId_|courseId_userId/;
const OPERATOR_BASE = /^(operatorProcedure|adminProcedure|publicProcedure|strategyScopedProcedure|campaignScopedProcedure)\b/;

function procBlocks(src: string): Array<{ name: string; base: string; body: string }> {
  const re =
    /\n {2}([a-zA-Z0-9_]+):\s*(governedProcedure|protectedProcedure|operatorProcedure|adminProcedure|publicProcedure|strategyScopedProcedure|campaignScopedProcedure|[a-zA-Z0-9_]+Procedure)\b/g;
  const marks: Array<{ name: string; base: string; start: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) marks.push({ name: m[1]!, base: m[2]!, start: m.index });
  return marks.map((mk, i) => ({
    name: mk.name,
    base: mk.base,
    body: src.slice(mk.start, i + 1 < marks.length ? marks[i + 1]!.start : src.length),
  }));
}

function inputFields(body: string): string[] {
  const idx = Math.max(body.indexOf(".input("), body.indexOf("inputSchema:"));
  if (idx < 0) return [];
  const slice = body.slice(idx, idx + 1200);
  return [...slice.matchAll(/(?:^|[\s{(])([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*z\./g)].map((x) => x[1]!);
}

/** Procédures founder-atteignables keyées sur un id d'entité, SANS garde reconnue. */
function scanUnguardedEntityIdProcs(): Array<{ file: string; name: string }> {
  const files = readdirSync(ROUTERS).filter((f) => f.endsWith(".ts") && !f.startsWith("_") && !f.endsWith(".test.ts"));
  const out: Array<{ file: string; name: string }> = [];
  for (const file of files) {
    const src = readFileSync(join(ROUTERS, file), "utf8");
    for (const blk of procBlocks(src)) {
      const requireOperator = /requireOperator:\s*true/.test(blk.body);
      const founderReachable = blk.base === "protectedProcedure" || (blk.base === "governedProcedure" && !requireOperator);
      if (!founderReachable || OPERATOR_BASE.test(blk.base)) continue;
      const fields = inputFields(blk.body);
      if (fields.length === 0) continue;
      const entityIds = fields.filter((f) => (f === "id" || /Id$/.test(f)) && f !== "strategyId" && f !== "campaignId");
      if (entityIds.length === 0) continue;
      if (CHOKEPOINT.test(blk.body) || SELF_SCOPE.test(blk.body)) continue;
      out.push({ file, name: blk.name });
    }
  }
  return out;
}

/**
 * SÛRES PAR CONCEPTION (round-10, vérifiées par lecture de handler). Clé =
 * `file.ts:proc`. Chaque raison dit POURQUOI l'absence de chokepoint explicite
 * n'est pas une faille. Ne PAS y ajouter une entrée sans avoir lu le handler.
 */
const SAFE_BY_DESIGN: Record<string, string> = {
  // ── Where-scope co-localisé (l'id d'entité ET le strategyId dans le même where) ──
  "actions.ts:setSelected": "updateMany where { id: actionId, strategyId } — action scopée au strategyId vérifié",
  "actions.ts:setTiming": "updateMany where { id: actionId, strategyId } — idem",
  // ── Catalogue/contenu GLOBAL (pas d'owner par-marque sur l'entité) ──
  "boutique.ts:getItem": "BoutiqueItem = catalogue public global (aucun owner par-user/marque)",
  "boutique.ts:order": "self-scopé : userId forcé = session ; amount recalculé server-side depuis item.price",
  "event.ts:get": "Event = catalogue staff-créé public (aucun owner par-marque)",
  "event.ts:register": "self-scopé : registration créée avec userId = session",
  "event.ts:unregister": "self-scopé : updateMany where { eventId, userId: session }",
  "editorial.ts:addComment": "self-scopé : authorId = session, sur un article global",
  "translation.ts:get": "TranslationDocument = pool de mémoire de traduction partagé (aucun champ owner)",
  "market-study-ingestion.ts:getDetail": "KnowledgeEntry MARKET_STUDY_RAW = intelligence sectorielle globale (secteur+pays, pas par-marque)",
  "market-study-ingestion.ts:exportResearchPdf": "idem getDetail — étude de marché sectorielle globale",
  // ── Marketplace public (surface profil publique délibérée) ──
  "guilde.ts:getGuildMetrics": "métriques agrégées d'org (memberCount/avgScore…), aucune PII par-personne",
  "guilde.ts:getPortfolio": "portfolio = travaux vitrine (déjà publics via getProfile)",
  "guilde.ts:getSkillTree": "compétences/tier/spécialités = même surface profil public",
  "guild-org.ts:getMetrics": "compteurs d'org agrégés (totalMembers/firstPassRate…), aucune PII",
  "membership.ts:checkStatus": "renvoie seulement { active, membershipId, expiresAt } — déjà exposé par guilde.getProfile",
  "imhotep.ts:recommendFormation": "lit seulement course.findMany({ isPublished: true }) ; userId échoé, jamais clé de lecture",
  "learning.ts:enroll": "self-scopé : enrollment créé avec userId = session (pas de cible arbitraire)",
  // ── Cross-check entité∈marque déjà présent (non capté par les regex de garde) ──
  "quick-intake.ts:purgeAndReingest": "handler : source.strategyId !== strategyId throw avant la transaction",
  "jehuty.ts:removeCuration": "deleteMany where { strategyId(vérifié), itemType, itemId } — scopé",
  "mission.ts:claim": "self-assign marketplace : gate guildPublished + DRAFT + !assigneeId + talentProfile du caller",
  // ── Provenance JSON / label — l'id n'est jamais déréférencé en lecture cross-tenant ──
  "signal.ts:ingestSocialMetrics": "postId stocké seulement dans signal.data (JSON) ; signal scopé au strategyId vérifié",
  "social.ts:ingestMetrics": "driverId/postId seulement dans signal.data (JSON) ; signal scopé au strategyId vérifié",
  "pr.ts:createRelease": "driverId stocké dans brandAsset.pillarTags (JSON) ; asset scopé au strategyId vérifié",
  "pr.ts:ingestClipping": "releaseId stocké dans signal.data (JSON) ; signal scopé au strategyId vérifié",
  "strategy-presentation.ts:forgeForSection": "sectionId = label (jamais chargé) ; l'asset forgé est chargé where { strategyId(vérifié), kind, DRAFT }",
  // ── Résolution en mémoire d'un plan strategy-scopé (stepId ∈ plan.steps) ──
  "mestor-router.ts:resolveStep": "loadPlan(strategyId vérifié) puis resolveHumanStep(plan, stepId) pur en mémoire — stepId étranger no-op",
  "brief-ingest.ts:advance": "orchestrationPlan findFirst where { strategyId } ; même resolveHumanStep en mémoire",
  // ── Ownership vérifiée en COUCHE SERVICE (pas dans le body du router) ──
  "talent-services.ts:toggle": "service toggleService vérifie talentService.talentProfileId === talentProfile du caller",
  "talent-services.ts:update": "service updateService : même check d'ownership talentProfileId",
};

describe("proactive: entity-id procedures are guarded or allowlisted (round-10)", () => {
  const flagged = scanUnguardedEntityIdProcs();

  it("aucune procédure entité-id founder-reachable non gardée hors allowlist", () => {
    const unexpected = flagged.filter((f) => !(`${f.file}:${f.name}` in SAFE_BY_DESIGN));
    const detail = unexpected.map((f) => `  ${f.file} → ${f.name}`).join("\n");
    expect(
      unexpected.length,
      `${unexpected.length} procédure(s) keyée(s) sur un id d'ENTITÉ, founder-atteignable(s), SANS garde d'ownership ni entrée SAFE_BY_DESIGN :\n${detail}\n\n` +
        `→ Poser une garde (resolve entité → marque/mission + assert*), OU basculer requireOperator, OU (si sûr par conception) ajouter à SAFE_BY_DESIGN avec une raison lue dans le handler.`,
    ).toBe(0);
  });

  it("aucune entrée SAFE_BY_DESIGN obsolète (toujours flaggée par le scan)", () => {
    const flaggedKeys = new Set(flagged.map((f) => `${f.file}:${f.name}`));
    const stale = Object.keys(SAFE_BY_DESIGN).filter((k) => !flaggedKeys.has(k));
    expect(
      stale.length,
      `${stale.length} entrée(s) SAFE_BY_DESIGN ne sont plus flaggées (procédure gardée depuis, renommée ou supprimée) — purger :\n${stale.map((s) => `  ${s}`).join("\n")}`,
    ).toBe(0);
  });

  it("le scan trouve bien des procédures (garde-fou anti-régression du parseur)", () => {
    // Si le parseur casse (0 proc trouvée), le test ci-dessus passerait à tort.
    expect(flagged.length).toBeGreaterThan(10);
  });
});
