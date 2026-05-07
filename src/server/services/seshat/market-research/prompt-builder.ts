/**
 * MarketResearch — LLM prompt builder.
 *
 * Construit le system + user prompt qui demandent au LLM de produire
 * un document `structured-market-study/v1` directement parsable par
 * `parseStructuredMarketStudy`. Le format est imposé pour garder la
 * voie LLM **bit-compatible** avec la voie manuelle (ADR-0060
 * manual-first parity).
 *
 * Trois leviers d'anti-fabrication encodés dans le prompt :
 *   1. Cellule vide / `-` quand la donnée n'est pas dans une source.
 *   2. Source textuelle (URL ou page) requise pour chaque chiffre.
 *   3. Si aucune source URL fournie, le LLM est obligé de marquer
 *      `source: "memory"` ET le UI affichera un warning.
 */

import { TREND_TRACKER_49 } from "@/server/services/seshat/knowledge/trend-tracker-49";
import type { FetchedSource } from "./web-fetcher";

const TEMPLATE_BUDGET_CHARS_PER_SOURCE = 12_000;
const TEMPLATE_BUDGET_TOTAL_CHARS = 80_000;

export interface BuildPromptInput {
  query: string;
  countryCode: string;
  sector: string;
  sources: FetchedSource[];
  brandNature?: string;
  cascadeLevel?: string;
  /** ISO date string for traceability inside the produced document. */
  generatedAt: string;
}

export interface BuiltPrompt {
  system: string;
  prompt: string;
  truncated: boolean;
  sourcesIncluded: number;
}

export function buildMarketResearchPrompt(input: BuildPromptInput): BuiltPrompt {
  const trendCatalog = TREND_TRACKER_49.map(
    (v) => `- ${v.code} (${v.category}) "${v.label}" [${v.unit}]`,
  ).join("\n");

  const okSources = input.sources.filter((s) => s.ok && s.text);
  const failedSources = input.sources.filter((s) => !s.ok);

  const memoryOnly = okSources.length === 0;

  const system = `Tu es un analyste sénior en intelligence marché, spécialiste Afrique + Europe. Ton output est un document Markdown au format strict \`structured-market-study/v1\` directement consommable par le pipeline Seshat MarketStudy ingestion (cf. \`docs/governance/templates/market-study-template.md\`).

CONTRAINTES DURES — anti-fabrication (ADR-0030 + ADR-0037) :
1. Tu produis UN SEUL document Markdown commençant par \`---\` frontmatter et contenant les 10 sections \`## §1\` à \`## §10\` exactement comme dans le template.
2. Chaque cellule de table où tu n'as PAS de donnée explicitement présente dans les sources fournies doit contenir \`-\` (tiret unique). Pas de fabrication. Pas d'estimation. Pas d'interpolation depuis un autre pays.
3. Pour chaque ligne où tu donnes un chiffre, la cellule \`source\` DOIT contenir soit l'URL exacte d'une source fournie, soit \`"memory"\` (uniquement si aucune source URL n'a été fournie en input).
4. Le frontmatter \`format:\` est exactement \`structured-market-study/v1\`.
5. Le frontmatter \`scoping.countryCode\` est exactement \`${input.countryCode}\` (ISO-2 majuscules).
6. Le frontmatter \`scoping.sector\` est exactement \`${input.sector}\`.
7. Le frontmatter \`study.geography\` est le pays au format texte (ex: "South Africa", "Cameroun").
8. Le frontmatter \`study.sectorCoverage\` contient au minimum le secteur cible.
9. Pas de placeholders \`REMPLIR\` / \`XX\` / \`YYYY-MM-DD\`. Si la valeur est inconnue, tu OMETS la clé entière du frontmatter (sauf champs requis : title, sectorCoverage, format, scoping.countryCode, scoping.sector).

CONVENTIONS CELLULES (mêmes que le template manuel) :
- Nombres : \`1200\`, \`0.085\`, \`5.2\` (point décimal). Pas de virgule.
- Listes : séparées par \`;\` (cellules \`behaviors\` / \`painPoints\`).
- Demographics : \`clé=valeur, clé=valeur\` (ex: \`age=18-25, income=mid\`).
- Causal chains : étapes séparées par \` -> \`.
- Enums : \`impactSeverity\` ∈ {LOW, MEDIUM, HIGH} ; \`timeHorizon\` ∈ {SHORT, MEDIUM, LONG} ; \`urgency\` ∈ {LOW, MEDIUM, HIGH, CRITICAL}.
- Trend Tracker §10 : tu dois renvoyer les 49 codes pré-listés (A1-A12, B1-B8, C1-C10, D1-D7, E1-E12). Cellule \`value\` vide (\`-\`) pour les codes que tu ne peux pas chiffrer depuis les sources.

49 variables canon Trend Tracker à scanner :
${trendCatalog}

${memoryOnly ? `\nATTENTION — MODE MÉMOIRE-MODÈLE :
Aucune source URL n'a été fournie. Tu produis le document depuis ta mémoire d'entraînement. CONSÉQUENCE :
- Toute cellule \`source\` est \`"memory"\` ou laissée vide.
- Tu dois être CONSERVATEUR : préfère \`-\` à un chiffre que tu ne peux pas attester par une source publiée. Le UI affichera un disclaimer.` : `\nMODE SOURCES :
${okSources.length} source(s) URL fournies (extraits inclus ci-dessous). Tu n'utilises QUE ces sources. Si une variable n'est pas couverte, cellule \`-\`.`}

Aucun texte hors du document Markdown. Pas de fence \`\`\`. Le document commence par \`---\` et finit par la dernière ligne du tableau §10.`;

  const sourcesBlock = okSources.length > 0
    ? `\n\n=== SOURCES FOURNIES ===\n${okSources.map((s, i) => formatSource(s, i + 1)).join("\n\n")}\n=== FIN SOURCES ===`
    : "";

  const failedBlock = failedSources.length > 0
    ? `\n\n[Sources non récupérées — à ignorer dans la rédaction]\n${failedSources.map((s) => `- ${s.url} : ${s.error ?? `HTTP ${s.status}`}`).join("\n")}`
    : "";

  const promptHeader = `Date de génération : ${input.generatedAt}
Pays cible : ${input.countryCode}
Secteur cible : ${input.sector}${input.brandNature ? `\nBrand nature : ${input.brandNature}` : ""}${input.cascadeLevel ? `\nCascade level : ${input.cascadeLevel}` : ""}

Question / brief opérateur :
${input.query.trim()}`;

  const fullPrompt = `${promptHeader}${sourcesBlock}${failedBlock}\n\nProduis le document Markdown complet.`;

  // Truncate sourcesBlock if combined prompt overshoots budget. Keep
  // promptHeader + tail markers intact.
  let outputPrompt = fullPrompt;
  let truncated = false;
  if (fullPrompt.length > TEMPLATE_BUDGET_TOTAL_CHARS) {
    truncated = true;
    const overhead = promptHeader.length + failedBlock.length + 200;
    const room = TEMPLATE_BUDGET_TOTAL_CHARS - overhead;
    const truncatedSourcesBlock = sourcesBlock.slice(0, Math.max(0, room));
    outputPrompt = `${promptHeader}${truncatedSourcesBlock}\n[...sources truncated to fit budget]${failedBlock}\n\nProduis le document Markdown complet.`;
  }

  return {
    system,
    prompt: outputPrompt,
    truncated,
    sourcesIncluded: okSources.length,
  };
}

function formatSource(source: FetchedSource, idx: number): string {
  const text = (source.text ?? "").slice(0, TEMPLATE_BUDGET_CHARS_PER_SOURCE);
  const truncatedTag = (source.text ?? "").length > TEMPLATE_BUDGET_CHARS_PER_SOURCE ? "\n[truncated]" : "";
  return `[Source ${idx}] ${source.url}${source.contentType ? ` (${source.contentType})` : ""}\n${text}${truncatedTag}`;
}
