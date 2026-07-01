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
2. Le frontmatter YAML en haut de ton document doit obligatoirement avoir cette structure exacte, avec 'title' sous 'study' et 'sectorCoverage' comme tableau (remplace <Pays> par le nom complet du pays cible, ex: "Cameroun", "Afrique du Sud", etc., et ne mets aucun placeholder comme REMPLIR/XX/YYYY-MM-DD) :
---
format: structured-market-study/v1
study:
  title: "Étude de marché — ${input.sector.replace(/"/g, '\\"')}"
  geography: "<Pays>"
  sectorCoverage:
    - "${input.sector.replace(/"/g, '\\"')}"
scoping:
  countryCode: "${input.countryCode}"
  sector: "${input.sector.replace(/"/g, '\\"')}"
---
3. Priorise au maximum les données issues des sources fournies si elles sont disponibles. Si les sources fournies ne couvrent pas certaines variables requises (ou si aucune source n'est fournie), tu es autorisé à utiliser ta propre mémoire d'analyste sénior pour estimer et inférer des données réalistes pour ce marché (au lieu de laisser un tableau vide). Pour chaque donnée estimée ou inférée depuis ta mémoire, tu DOIS obligatoirement indiquer "memory" ou "inferred" dans la colonne de source.
4. Pour chaque ligne où tu donnes un chiffre, la cellule \`source\` DOIT contenir soit l'URL exacte d'une des sources fournies, soit \`"memory"\` / \`"inferred"\` si la donnée provient de tes connaissances d'analyste.
5. RÈGLE STRICTE SUR LES LIGNES DE TABLEAU : Pour chaque tableau, si tu n'as pas de données valides pour TOUTES les colonnes obligatoires d'une ligne (ex: pour la croissance en §2, si tu n'as pas la CAGR ou la période ; pour les concurrents en §3, si tu n'as pas l'année ; pour les segments en §4, si tu n'as pas la taille en % ; etc.), n'écris PAS cette ligne du tout. Les lignes partiellement renseignées (contenant des tirets '-' dans des colonnes obligatoires à côté de colonnes remplies) provoquent des échecs de parsing. Si tu n'as aucune donnée complète pour un tableau entier, laisse-le avec une unique ligne de tirets (ex: \`| - | - | - | - |\`).

CONVENTIONS CELLULES (mêmes que le template manuel) :
- Nombres : \`1200\`, \`0.085\`, \`5.2\` (point décimal). Pas de virgule.
- Listes : séparées par \`;\` (cellules \`behaviors\` / \`painPoints\`).
- Demographics : \`clé=valeur, clé=valeur\` (ex: \`age=18-25, income=mid\`).
- Causal chains : étapes séparées par \` -> \`.
- Enums : \`impactSeverity\` ∈ {LOW, MEDIUM, HIGH} ; \`timeHorizon\` ∈ {SHORT, MEDIUM, LONG} ; \`urgency\` ∈ {LOW, MEDIUM, HIGH, CRITICAL}.
- Table §1 : La colonne \`metric\` DOIT contenir uniquement la valeur exacte \`TAM\`, \`SAM\` ou \`SOM\` sans aucun texte additionnel ou parenthèses (ex: pas de "TAM (Ciment)").
- Table §10 : La colonne \`confidence\` DOIT obligatoirement être un nombre décimal entre 0 et 1 (ex: \`0.85\`, \`0.5\`) ou un tiret \`-\`. Ne mets jamais de qualificatif textuel (ex: pas de "MEDIUM", "LOW", "HIGH").
- Toutes les tables (notamment §1, §3, §10) : La colonne \`year\` DOIT être un nombre entier de 4 chiffres représentant une année unique (ex: \`2024\`, \`2025\`) ou un tiret \`-\`. Les plages d'années (ex: "2020-2025") sont strictement interdites.
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
- Remplis les tableaux de manière complète et réaliste en utilisant tes connaissances pour ce pays et ce secteur.
- Toute cellule \`source\` de ces lignes doit obligatoirement être renseignée comme \`"memory"\` ou \`"inferred"\`.` : `\nMODE SOURCES :
${okSources.length} source(s) URL fournies (extraits inclus ci-dessous). Priorise ces sources pour remplir le document. Si une donnée n'est pas présente dans les sources fournies, tu es encouragé à l'estimer/l'inférer depuis tes connaissances générales du pays/secteur afin de ne pas laisser de tableau vide, et d'indiquer \`"memory"\` ou \`"inferred"\` dans sa colonne \`source\`.`}

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
