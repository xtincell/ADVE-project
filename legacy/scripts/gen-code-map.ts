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

// ── Renderer ───────────────────────────────────────────────────────

function render(): string {
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
