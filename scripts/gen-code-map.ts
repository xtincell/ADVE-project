/**
 * gen-code-map.ts — génère docs/governance/CODE-MAP.md.
 *
 * Knowledge graph machine-lisible pour empêcher la réinvention de la roue.
 * Lit :
 *   - prisma/schema.prisma (models, enums, relations)
 *   - src/server/services/* (services + manifests)
 *   - src/server/trpc/routers/* (routers)
 *   - src/app/* (pages)
 *   - src/server/services/artemis/tools/registry.ts (Glory tools)
 *   - src/server/services/artemis/tools/sequences.ts (sequences)
 *
 * Output : CODE-MAP.md avec sections searchables par mots-clés.
 *
 * Usage : npx tsx scripts/gen-code-map.ts
 * Pre-commit hook : régénère automatiquement.
 */

import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");

// ── Helpers ────────────────────────────────────────────────────────

function read(rel: string): string {
  try {
    return readFileSync(join(ROOT, rel), "utf-8");
  } catch {
    return "";
  }
}

function listFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];
  function walk(d: string) {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const e of entries) {
      if (e === "node_modules" || e === ".next" || e === ".git") continue;
      const full = join(d, e);
      let s;
      try { s = statSync(full); } catch { continue; }
      if (s.isDirectory()) walk(full);
      else if (pattern.test(e)) files.push(relative(ROOT, full));
    }
  }
  walk(join(ROOT, dir));
  return files;
}

// ── Parsers ────────────────────────────────────────────────────────

function parsePrismaModels(): Array<{ name: string; doc?: string; fields: number }> {
  const schema = read("prisma/schema.prisma");
  const models: Array<{ name: string; doc?: string; fields: number }> = [];
  const lines = schema.split("\n");
  let buffer: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const m = line.match(/^model (\w+) \{/);
    if (m) {
      // Walk forward to count fields and find closing }
      let fieldCount = 0;
      let j = i + 1;
      while (j < lines.length && !lines[j]!.startsWith("}")) {
        const l = lines[j]!.trim();
        if (l && !l.startsWith("//") && !l.startsWith("@@") && !l.startsWith("///")) {
          fieldCount++;
        }
        j++;
      }
      // Look for /// triple-slash doc above
      let doc: string | undefined;
      for (let k = i - 1; k >= 0; k--) {
        const lk = lines[k]?.trim() ?? "";
        if (lk.startsWith("///")) {
          const docLine = lk.replace(/^\/\/\/\s?/, "");
          doc = doc ? `${docLine} ${doc}` : docLine;
        } else if (lk === "" || lk.startsWith("//")) {
          continue;
        } else {
          break;
        }
      }
      models.push({ name: m[1]!, doc, fields: fieldCount });
      i = j;
    }
    i++;
    buffer = [];
  }
  return models;
}

function parsePrismaEnums(): Array<{ name: string; values: string[] }> {
  const schema = read("prisma/schema.prisma");
  const enums: Array<{ name: string; values: string[] }> = [];
  const re = /^enum (\w+) \{([^}]+)\}/gm;
  let m;
  while ((m = re.exec(schema)) !== null) {
    const values = m[2]!
      .split("\n")
      .map((l) => l.trim().split(/\s|\/\//)[0])
      .filter((v) => v && /^[A-Z_]+$/.test(v));
    enums.push({ name: m[1]!, values });
  }
  return enums;
}

function listServices(): Array<{ name: string; manifest: boolean }> {
  let entries: string[];
  try {
    entries = readdirSync(join(ROOT, "src/server/services"));
  } catch {
    return [];
  }
  return entries
    .filter((e) => {
      try {
        return statSync(join(ROOT, "src/server/services", e)).isDirectory();
      } catch {
        return false;
      }
    })
    .map((name) => ({
      name,
      manifest: read(`src/server/services/${name}/manifest.ts`).length > 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function listRouters(): string[] {
  let entries: string[];
  try {
    entries = readdirSync(join(ROOT, "src/server/trpc/routers"));
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.endsWith(".ts"))
    .map((e) => e.replace(/\.ts$/, ""))
    .sort();
}

function listPages(): { deck: string; path: string }[] {
  const all = listFiles("src/app", /^page\.tsx$/);
  const out: { deck: string; path: string }[] = [];
  for (const f of all) {
    const route = "/" + f
      .replace(/^src\/app\//, "")
      .replace(/\/page\.tsx$/, "")
      .replace(/\([^)]+\)\//g, "");
    let deck = "Public";
    if (f.includes("(cockpit)")) deck = "Cockpit";
    else if (f.includes("(console)")) deck = "Console";
    else if (f.includes("(agency)")) deck = "Agency";
    else if (f.includes("(creator)")) deck = "Creator";
    else if (f.includes("(intake)")) deck = "Launchpad";
    out.push({ deck, path: route || "/" });
  }
  return out.sort((a, b) => a.deck.localeCompare(b.deck) || a.path.localeCompare(b.path));
}

function parseGloryTools(): Array<{ slug: string; name: string; layer: string; outputFormat: string; brief2forge: boolean }> {
  const reg = read("src/server/services/artemis/tools/registry.ts");
  const out: Array<{ slug: string; name: string; layer: string; outputFormat: string; brief2forge: boolean }> = [];
  // Match patterns: { slug: "...", name: "...", layer: "..." ... outputFormat: "..." ... [forgeOutput?] ... },
  const blocks = reg.split(/\n\s*\{\s*$/m);
  for (const block of blocks) {
    const slug = block.match(/^\s*slug:\s*"([^"]+)"/m)?.[1] ?? block.match(/slug:\s*"([^"]+)"/)?.[1];
    if (!slug) continue;
    const name = block.match(/name:\s*"([^"]+)"/)?.[1] ?? slug;
    const layer = block.match(/layer:\s*"([^"]+)"/)?.[1] ?? "?";
    const outputFormat = block.match(/outputFormat:\s*"([^"]+)"/)?.[1] ?? "?";
    const brief2forge = /forgeOutput:\s*\{/.test(block);
    out.push({ slug, name, layer, outputFormat, brief2forge });
  }
  return out;
}

function parseSequences(): Array<{ key: string; family: string; name: string; tier?: number }> {
  const seq = read("src/server/services/artemis/tools/sequences.ts");
  const out: Array<{ key: string; family: string; name: string; tier?: number }> = [];
  const re = /key:\s*"([^"]+)",\s*family:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(seq)) !== null) {
    out.push({ key: m[1]!, family: m[2]!, name: m[3]! });
  }
  return out;
}

function parseIntentKinds(): Array<{ kind: string; governor: string; handler: string; async: string; description: string }> {
  const reg = read("src/server/governance/intent-kinds.ts");
  const out: Array<{ kind: string; governor: string; handler: string; async: string; description: string }> = [];
  const re = /\{\s*kind:\s*"([^"]+)",\s*governor:\s*"([^"]+)",\s*handler:\s*"([^"]+)",\s*async:\s*(true|false),\s*description:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(reg)) !== null) {
    out.push({ kind: m[1]!, governor: m[2]!, handler: m[3]!, async: m[4]!, description: m[5]! });
  }
  return out;
}

/**
 * Modules de domaine (`src/domain/*.ts`) — le cœur métier pur.
 *
 * Ajouté le 2026-07-31 : l'audit anti-réinvention a montré que les machines
 * les plus réinventées (échelle de marché ADR-0126, paliers/must-have items,
 * graphes) vivent PRÉCISÉMENT ici — et que cette couche n'était pas indexée.
 * Un module de domaine hors carte est une roue que personne ne trouvera.
 */
function listDomainModules(): Array<{ name: string; doc: string }> {
  let entries: string[];
  try {
    entries = readdirSync(join(ROOT, "src/domain"));
  } catch {
    return [];
  }
  const out: Array<{ name: string; doc: string }> = [];
  for (const e of entries.sort()) {
    const full = join(ROOT, "src/domain", e);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) {
      // sous-dossier (ex. scoreur/) : indexer chaque fichier
      for (const f of readdirSync(full).filter((x) => x.endsWith(".ts")).sort()) {
        const src = read(`src/domain/${e}/${f}`);
        out.push({ name: `${e}/${f.replace(/\.ts$/, "")}`, doc: firstDocLine(src) });
      }
      continue;
    }
    if (!e.endsWith(".ts") || e === "index.ts") continue;
    const src = read(`src/domain/${e}`);
    out.push({ name: e.replace(/\.ts$/, ""), doc: firstDocLine(src) });
  }
  return out;
}

/** Première ligne utile du doc-comment d'en-tête — le résumé greppable. */
function firstDocLine(src: string): string {
  const m = src.match(/\/\*\*\s*\n((?:\s*\*[^\n]*\n)+?)\s*\*\//);
  if (!m) return "";
  const lines = m[1]!
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "").trim())
    .filter((l) => l && !l.startsWith("@"));
  return (lines[0] ?? "").slice(0, 160);
}

// ── Renderer ───────────────────────────────────────────────────────

function render(): string {
  const domainModules = listDomainModules();
  const models = parsePrismaModels();
  const enums = parsePrismaEnums();
  const services = listServices();
  const routers = listRouters();
  const pages = listPages();
  const gloryTools = parseGloryTools();
  const sequences = parseSequences();
  const intents = parseIntentKinds();

  const pagesByDeck: Record<string, string[]> = {};
  for (const p of pages) {
    pagesByDeck[p.deck] = pagesByDeck[p.deck] || [];
    pagesByDeck[p.deck]!.push(p.path);
  }

  const sequencesByFamily: Record<string, string[]> = {};
  for (const s of sequences) {
    sequencesByFamily[s.family] = sequencesByFamily[s.family] || [];
    sequencesByFamily[s.family]!.push(`\`${s.key}\` — ${s.name}`);
  }

  const gloryByLayer: Record<string, string[]> = {};
  for (const g of gloryTools) {
    gloryByLayer[g.layer] = gloryByLayer[g.layer] || [];
    gloryByLayer[g.layer]!.push(`\`${g.slug}\` (${g.outputFormat}${g.brief2forge ? " · brief→forge" : ""})`);
  }

  const intentsByGovernor: Record<string, string[]> = {};
  for (const i of intents) {
    intentsByGovernor[i.governor] = intentsByGovernor[i.governor] || [];
    intentsByGovernor[i.governor]!.push(`\`${i.kind}\` → ${i.handler} (${i.async === "true" ? "async" : "sync"}) — ${i.description.slice(0, 80)}…`);
  }

  return `# CODE-MAP — Knowledge graph du repo

**Auto-généré par \`scripts/gen-code-map.ts\` à chaque commit.** Ne pas éditer à la main.

> **Avant d'ajouter une entité métier (model Prisma, service, router, page, glory tool, sequence, intent kind), GREP CE FICHIER avec les mots-clés synonymes. Si entité similaire existe → étendre, ne pas doubler.** Sinon → ADR obligatoire avec justification.

Régénération : \`npx tsx scripts/gen-code-map.ts\`. Régénéré pre-commit via husky.

---

## Synonymes & patterns à connaître (anti-drift)

Ces correspondances évitent la réinvention :

| Mot du métier | Entité dans le code | Notes |
|---|---|---|
| **vault** / "vault de marque" / "asset rangé" | \`BrandAsset\` (Phase 10, ADR-0012) | Réceptacle unifié — intellectuel + matériel |
| **SuperAsset** | \`BrandAsset.kind=BIG_IDEA/CREATIVE_BRIEF/...\` | Pas de table SuperAsset — terme conceptuel |
| **forge** / "asset forgé" / "image générée" | \`AssetVersion\` (Phase 9 Ptah) + \`BrandAsset\` matériel | AssetVersion = forge brut, BrandAsset = vault catalogué |
| **brief créatif** / "brief 360" | \`BrandAsset.kind=CREATIVE_BRIEF/BRIEF_360\` + \`CampaignBrief\` lié | CampaignBrief = pointer business, BrandAsset = contenu |
| **big idea active** | \`Campaign.activeBigIdeaId\` → \`BrandAsset (kind=BIG_IDEA, state=ACTIVE)\` | 1 ACTIVE par kind par Campaign |
| **prompt KV** / "kv-prompt" | Glory tool \`kv-banana-prompt-generator\` (brief→forge) → \`BrandAsset.kind=KV_PROMPT\` → Ptah Nano Banana → \`AssetVersion\` |
| **plan d'orchestration** | \`OrchestrationPlan\` |
| **mission** | \`Mission\` (commercial creative delivery) — distinct de "brand mission" (APOGEE) |
| **livrable** | \`MissionDeliverable\` ou \`SequenceExecution\` |
| **devotion / superfan** | \`DevotionSnapshot\` + \`Strategy.cultIndex\` |
| **calendrier campagne** | \`CampaignMilestone\` + \`CampaignAction\` |
| **AARRR funnel** | \`CampaignAARRMetric\` + \`CampaignAction.aarrStage\` |
| **forge multimodale Magnific/Adobe/Figma/Canva** | \`GenerativeTask\` + provider \`src/server/services/ptah/providers/\` |
| **manipulation mode** | \`Strategy.manipulationMix\` + \`BrandAsset.manipulationMode\` + \`GenerativeTask.manipulationMode\` |
| **ROI superfan** | \`expectedSuperfans\` / \`realisedSuperfans\` sur GenerativeTask + \`cultIndexDeltaObserved\` AssetVersion |
| **classement** / "rang" / "percentile" / "force marché" / "leaderboard" / "étalonnage" | Scoreur Seshat \`seshat/scoreur/\` (ADR-0149/0150) — θ Bradley-Terry, \`Epreuve\`, \`BrandRef\` | On ne note pas des attributs, on compte des VICTOIRES. Ne jamais bâtir un axe percentile à côté |
| **ligue** / "échelle de marché" / "standard du rang" | \`league {sectorSlug, marketScale, countryCode}\` + \`EVIDENCE_TARGETS_BY_SCALE\` \`src/domain/market-scale.ts\` (ADR-0126) | Chaque marque dans SA ligue — planchers par échelle QUARTIER→MONDE |
| **must-have du rang** / "critères de palier" / "promotion" | \`MUST_HAVE_ITEMS\` \`src/domain/scoreur/palier.ts\` + gate \`PALIER_PROMOTION_PROOFS\` (ADR-0086/0167) | Items par palier disputés en épreuves — le rang se PROUVE |
| **palier officiel** / "niveau de marque persisté" / "ratchet" | \`Strategy.apogeeTier\` + \`effectiveTier()\` (ADR-0167) | Mû par transition gouvernée seulement — distinct du niveau d'INTAKE (\`brand-level-evaluator\`, prospects) |
| **plafond de preuve** / "evidence ceiling" | Composite : \`advertis-scorer/evidence.ts\` (ADR-0126) · Niveau intake : \`evidenceCeiling\` \`brand-level-evaluator.ts\` (miroir côté prospect) | Un chiffre ne dépasse jamais sa preuve |
| **plancher de visibilité** / "marque constatée" | \`observedVisibility\` + floor \`brand-level-evaluator.ts\` | Une marque CONSTATÉE n'est jamais « invisible » (LATENT) |
| **force révélée /200** | \`getForceByToken\` (quick-intake router) → \`seshat/scoreur\` \`compileMeasuredEpreuves\` (ADR-0149) | DÉJÀ affichée au rapport d'intake |
| **empreinte** / "scan public" / "collecte" | \`quick-intake/web-footprint.ts\` + \`public-enrichment.ts\` → \`FootprintFacts\` | Admission via \`signal-gateway\` (ADR-0188) ; site/sameAs = preuve d'appartenance max |
| **rescan** / "recalcul" | \`regenerateAnalysis\` (collecte+extraction) · \`rescoreIntake\` (recompte seul, gratuit) — \`POST /api/admin/rescore-intakes\` | Deux modes d'UNE machine — ne pas en créer une 3ᵉ |
| **corpus** / "registre de marques scannées" | \`BrandFootprintSnapshot\` + \`getRegistryPosition\` (\`seshat/brand-registry\`, ADR-0151) | Alimente \`MarketBenchmark\` p10/p50/p90 (cron, ≥5 marques) |

### Machines & état de câblage — lu AVANT de concevoir (2026-07-31)

La leçon de l'audit : la machinerie DORMANTE est invisible au runtime — « prévu mais
non effectué » ne se voit ni dans un grep de symptôme ni dans les données. Cette
table dit ce qui tourne et ce qui attend d'être branché. **On câble l'existant, on ne réinvente jamais** (loi opérateur).

| Machine | Câblé (WIRED) | Dormant (à brancher, PAS à réinventer) |
|---|---|---|
| Scoreur (ADR-0149) | Arène E (audience vs plancher de ligue) · arène T (Overton) · épreuves persistées · \`getForceByToken\` au rapport | Presse/publications/distinctions collectées → JAMAIS compilées en épreuves ; items \`MUST_HAVE_ITEMS\` jamais disputés depuis la collecte |
| Collecteur d'empreinte | Site (déclaré ou découvert) · sameAs/JSON-LD/flux (ADR-0190) · Apify audiences · presse · Wikipédia (langue = pays) | Découverte NON ÉPINGLÉE : un rescan peut élire un homonyme (mesuré : \`irawo.net\`, association de Cotonou, a écrasé \`irawotalents.com\`) — épingler le site corroboré |
| Niveau d'intake (\`brand-level-evaluator\`) | 2 voies (LLM+déterministe) · plancher visibilité · plafond de preuve · \`basis\` 2 axes | Fusion à terme avec \`apogeeTier\`/\`palier.ts\` via épreuves (3 systèmes de palier coexistent — n'en créer AUCUN 4ᵉ) |
| Benchmarks marché (ADR-0156) | Agrégation cron ≥5 marques | Registre mince (5 lignes post-purge) ; percentile s'abstient sous 10 pairs |

---

## Domain — ${domainModules.length} modules (src/domain, cœur métier pur)

${domainModules.map((d) => `- **${d.name}**${d.doc ? ` — ${d.doc}` : ""}`).join("\n")}

---

## Prisma — ${models.length} models, ${enums.length} enums

### Models

${models.map((m) => `- **${m.name}** (${m.fields} fields)${m.doc ? ` — ${m.doc.slice(0, 120)}` : ""}`).join("\n")}

### Enums

${enums.map((e) => `- **${e.name}** : ${e.values.join(" | ")}`).join("\n")}

---

## Services backend — ${services.length}

${services.map((s) => `- \`src/server/services/${s.name}/\`${s.manifest ? " ✓ manifest" : ""}`).join("\n")}

---

## tRPC routers — ${routers.length}

${routers.map((r) => `- \`${r}\` (\`src/server/trpc/routers/${r}.ts\`)`).join("\n")}

---

## Pages — ${pages.length} (par deck)

${Object.entries(pagesByDeck).map(([deck, paths]) => `### ${deck} (${paths.length})\n\n${paths.map((p) => `- \`${p}\``).join("\n")}`).join("\n\n")}

---

## Glory tools — ${gloryTools.length} (par layer)

${Object.entries(gloryByLayer).map(([layer, tools]) => `### Layer ${layer} (${tools.length})\n\n${tools.map((t) => `- ${t}`).join("\n")}`).join("\n\n")}

**Brief-to-forge tools (Phase 9 ADR-0009)** : ${gloryTools.filter((g) => g.brief2forge).length}

---

## Glory sequences — ${sequences.length} (par family)

${Object.entries(sequencesByFamily).map(([fam, seqs]) => `### ${fam} (${seqs.length})\n\n${seqs.map((s) => `- ${s}`).join("\n")}`).join("\n\n")}

---

## Intent kinds — ${intents.length} (par governor)

${Object.entries(intentsByGovernor).map(([gov, items]) => `### ${gov} (${items.length})\n\n${items.map((i) => `- ${i}`).join("\n")}`).join("\n\n")}

---

## Lectures associées (gouvernance narrative)

- [PANTHEON.md](PANTHEON.md) — les 7 Neteru et leur rôle
- [APOGEE.md](APOGEE.md) — framework de pilotage de trajectoire
- [LEXICON.md](LEXICON.md) — vocabulaire normatif (BrandAsset, SuperAsset, etc.)
- [MISSION.md](MISSION.md) — north star anti-drift
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — 4 modes d'engagement audience
- [SERVICE-MAP.md](SERVICE-MAP.md) — services par sous-système APOGEE
- [PAGE-MAP.md](PAGE-MAP.md) — pages par deck
- [ROUTER-MAP.md](ROUTER-MAP.md) — routers tRPC par sous-système
- [INTENT-CATALOG.md](INTENT-CATALOG.md) — intents complet avec SLOs
- [adr/](adr/) — décisions architecturales historiques
`;
}

// ── Main ───────────────────────────────────────────────────────────

const out = render();
const target = join(ROOT, "docs/governance/CODE-MAP.md");
writeFileSync(target, out, "utf-8");
const lines = out.split("\n").length;
console.log(`✓ CODE-MAP.md generated: ${lines} lines, ${out.length} chars → docs/governance/CODE-MAP.md`);
