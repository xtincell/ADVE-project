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
import { wrapUntrusted, sanitizeInline } from "@/server/services/utils/untrusted-content";
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
STRUCTURE DES SECTIONS ET EN-TÊTES DE TABLEAUX (CONTRAINTE STRICTE DE FORMAT) :
Tu dois obligatoirement utiliser EXACTEMENT les titres de section et en-têtes de colonnes suivants (respecte l'ordre et les noms exacts des colonnes) :

## §1 TAM / SAM / SOM
| metric | value | currency | year | methodology | source |

## §2 Croissance & saisonnalité
| segment | cagr | period | source |

## §3 Concurrents
| name | marketSharePct | year | source |

## §4 Segments consommateur
| segment | sizePct | demographics | behaviors | painPoints |

## §5 Prix
| tier | range | asp | source |

## §6 Mix canaux
| channel | sharePct | growthTrend |

## §7 Réglementaire
| regulation | impactSeverity | timeline |

## §8 Macro signals
| trend | evidence | timeHorizon |

## §9 Signaux faibles
| event | causalChain | impactCategory | urgency |

## §10 Trend Tracker — 49 variables canon
| code | label | value | year | source | confidence |

49 variables canon Trend Tracker à scanner (remplis les codes correspondants dans le tableau §10) :
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
    ? `\n\n[Sources non récupérées — à ignorer dans la rédaction]\n${failedSources.map((s) => `- ${sanitizeInline(s.url, { max: 500 })} : ${sanitizeInline(s.error ?? `HTTP ${s.status}`, { max: 300 })}`).join("\n")}`
    : "";

  // LOT 1e — entrée non fiable neutralisée (anti-injection) : valeurs déclarées
  // par l'opérateur (pays, secteur, nature de marque, niveau de cascade) et
  // surtout le brief libre (query) sont neutralisés avant concaténation.
  const promptHeader = `Date de génération : ${input.generatedAt}
Pays cible : ${sanitizeInline(input.countryCode, { max: 100 })}
Secteur cible : ${sanitizeInline(input.sector, { max: 200 })}${input.brandNature ? `\nBrand nature : ${sanitizeInline(input.brandNature, { max: 200 })}` : ""}${input.cascadeLevel ? `\nCascade level : ${sanitizeInline(input.cascadeLevel, { max: 200 })}` : ""}

${wrapUntrusted("Question / brief opérateur", input.query.trim(), { max: 4000 })}`;

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
  // LOT 1e — entrée non fiable neutralisée (anti-injection) : le corps de la
  // source est du texte web fetché (vecteur d'injection RAG) → fencé ; l'URL
  // (fournie par l'opérateur) est neutralisée inline.
  const safeUrl = sanitizeInline(source.url, { max: 500 });
  const body = wrapUntrusted(
    `Source ${idx} (${safeUrl}${source.contentType ? `, ${sanitizeInline(source.contentType, { max: 100 })}` : ""})`,
    `${text}${truncatedTag}`,
    { max: TEMPLATE_BUDGET_CHARS_PER_SOURCE + 200 },
  );
  return `[Source ${idx}] ${safeUrl}${source.contentType ? ` (${sanitizeInline(source.contentType, { max: 100 })})` : ""}\n${body}`;
}
