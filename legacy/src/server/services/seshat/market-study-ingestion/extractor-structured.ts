/**
 * MarketStudy structured extractor (ADR-0037 PR-I + ADR-0060 manual-first parity).
 *
 * Pure parser : markdown structuré (`structured-market-study/v1`) → `MarketStudyExtraction`.
 * Aucun appel LLM. Aucun I/O. Anti-fabrication par design : une cellule vide ou `-`
 * produit `null`/absent — jamais une valeur fabriquée.
 *
 * Voie parallèle à `extractor-llm.ts` (qui lit du PDF/DOCX/XLSX). Le contrat de sortie
 * (`MarketStudyExtractionSchema`) est partagé : la persistance via `persistMarketStudy`
 * fonctionne identiquement quel que soit l'extracteur.
 *
 * Format canonique attendu : voir [`docs/governance/templates/market-study-template.md`].
 */

import { MarketStudyExtractionSchema, type MarketStudyExtraction } from "./types";

const TEMPLATE_FORMAT_V1 = "structured-market-study/v1" as const;

export interface StructuredFrontmatter {
  format: string;
  study: {
    title: string;
    publisher?: string;
    publishedAt?: string;
    methodology?: string;
    sampleSize?: number;
    geography?: string;
    sectorCoverage: string[];
  };
  scoping?: {
    countryCode?: string;
    sector?: string;
    brandNature?: string;
    cascadeLevel?: string;
    period?: string;
  };
  sources?: string[];
}

export interface StructuredParseSuccess {
  ok: true;
  frontmatter: StructuredFrontmatter;
  extraction: MarketStudyExtraction;
  warnings: string[];
}

export interface StructuredParseFailure {
  ok: false;
  errors: string[];
  warnings: string[];
}

export type StructuredParseResult = StructuredParseSuccess | StructuredParseFailure;

const SECTION_SPEC = {
  "1": { title: "TAM / SAM / SOM", headers: ["metric", "value", "currency", "year", "methodology", "source"] },
  "2": { title: "Croissance", headers: ["segment", "cagr", "period", "source"] },
  "3": { title: "Concurrents", headers: ["name", "marketSharePct", "year", "source"] },
  "4": { title: "Segments", headers: ["segment", "sizePct", "demographics", "behaviors", "painPoints"] },
  "5": { title: "Prix", headers: ["tier", "range", "asp", "source"] },
  "6": { title: "Canaux", headers: ["channel", "sharePct", "growthTrend"] },
  "7": { title: "Réglementaire", headers: ["regulation", "impactSeverity", "timeline"] },
  "8": { title: "Macro", headers: ["trend", "evidence", "timeHorizon"] },
  "9": { title: "Signaux faibles", headers: ["event", "causalChain", "impactCategory", "urgency"] },
  "10": { title: "Trend Tracker", headers: ["code", "label", "value", "year", "source", "confidence"] },
} as const;

type SectionId = keyof typeof SECTION_SPEC;

export function parseStructuredMarketStudy(markdown: string): StructuredParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const split = splitFrontmatter(markdown);
  if (!split.ok) return { ok: false, errors: split.errors, warnings };

  const fmResult = parseFrontmatter(split.frontmatter);
  if (!fmResult.ok) return { ok: false, errors: fmResult.errors, warnings };
  const frontmatter = fmResult.value;

  if (frontmatter.format !== TEMPLATE_FORMAT_V1) {
    return {
      ok: false,
      errors: [`Unsupported format "${frontmatter.format}"; expected "${TEMPLATE_FORMAT_V1}"`],
      warnings,
    };
  }

  if (!frontmatter.study?.title || isPlaceholder(frontmatter.study.title)) {
    errors.push("study.title is missing or still a placeholder");
  }
  if (!frontmatter.study?.sectorCoverage?.length || frontmatter.study.sectorCoverage.every(isPlaceholder)) {
    errors.push("study.sectorCoverage is missing or only contains placeholders");
  }

  const sections = splitSections(split.body);

  const tamRows = parseSectionTable(sections, "1", errors, warnings);
  const tamTriple = parseTamSection(tamRows, errors);

  const growthRows = parseSectionTable(sections, "2", errors, warnings);
  const growthRates = parseGrowthRates(growthRows, errors);

  const competitorRows = parseSectionTable(sections, "3", errors, warnings);
  const competitorShares = parseCompetitors(competitorRows, errors);

  const segmentRows = parseSectionTable(sections, "4", errors, warnings);
  const consumerSegments = parseSegments(segmentRows, errors);

  const priceRows = parseSectionTable(sections, "5", errors, warnings);
  const pricePoints = parsePricePoints(priceRows, errors);

  const channelRows = parseSectionTable(sections, "6", errors, warnings);
  const channelMix = parseChannelMix(channelRows, errors);

  const regulatoryRows = parseSectionTable(sections, "7", errors, warnings);
  const regulatorySignals = parseRegulatory(regulatoryRows, errors);

  const macroRows = parseSectionTable(sections, "8", errors, warnings);
  const macroSignals = parseMacro(macroRows, errors);

  const weakRows = parseSectionTable(sections, "9", errors, warnings);
  const weakSignals = parseWeakSignals(weakRows, errors);

  const trendRows = parseSectionTable(sections, "10", errors, warnings);
  const trendTracker = parseTrendTracker(trendRows, errors);

  const sampleSize =
    typeof frontmatter.study.sampleSize === "number" && frontmatter.study.sampleSize > 0
      ? frontmatter.study.sampleSize
      : undefined;

  const extraction: MarketStudyExtraction = {
    study: {
      title: frontmatter.study.title,
      publisher: discardPlaceholder(frontmatter.study.publisher),
      publishedAt: discardPlaceholder(frontmatter.study.publishedAt),
      methodology: discardPlaceholder(frontmatter.study.methodology),
      sampleSize,
      geography: discardPlaceholder(frontmatter.study.geography),
      sectorCoverage: frontmatter.study.sectorCoverage.filter((s) => !isPlaceholder(s)),
    },
    tam: tamTriple.tam,
    sam: tamTriple.sam,
    som: tamTriple.som,
    growthRates,
    competitorShares,
    consumerSegments,
    pricePoints,
    channelMix,
    regulatorySignals,
    macroSignals,
    weakSignals,
    trendTracker: Object.keys(trendTracker).length > 0 ? trendTracker : undefined,
  };

  const validated = MarketStudyExtractionSchema.safeParse(extraction);
  if (!validated.success) {
    errors.push(`Schema validation failed: ${validated.error.message.slice(0, 300)}`);
  }

  if (errors.length > 0) return { ok: false, errors, warnings };

  return { ok: true, frontmatter, extraction: validated.data!, warnings };
}

// ── Frontmatter split ────────────────────────────────────────────────

function splitFrontmatter(
  markdown: string,
): { ok: true; frontmatter: string; body: string } | { ok: false; errors: string[] } {
  const stripped = markdown.replace(/^﻿/, "");
  const noComment = stripped.replace(/^<!--[\s\S]*?-->\s*/m, "");
  const m = noComment.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) {
    return {
      ok: false,
      errors: ["Missing YAML frontmatter delimited by `---` lines at the top of the document"],
    };
  }
  return { ok: true, frontmatter: m[1] ?? "", body: m[2] ?? "" };
}

// ── Frontmatter YAML-subset parser ───────────────────────────────────
//
// Supports : top-level `key: scalar`, `key:` followed by indented children
// (2-space indent, depth ≤ 2), `- item` lists at depth 1 or 2. Quoted
// strings ("..." or '...') honored. Numbers parsed as numbers ; bare
// `null`, `~`, `true`, `false` honored ; everything else is string.
// Single-pass index-driven walk — no mutation of the input array.

function parseFrontmatter(text: string): { ok: true; value: StructuredFrontmatter } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);
  const root: Record<string, unknown> = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    if (/^\s/.test(line)) {
      errors.push(`Unexpected indented line at top level: "${line}"`);
      i++;
      continue;
    }
    const kv = matchKeyValue(line);
    if (!kv) {
      errors.push(`Cannot parse top-level frontmatter line: "${line}"`);
      i++;
      continue;
    }
    i++;
    if (kv.value !== undefined) {
      root[kv.key] = decodeScalar(kv.value);
      continue;
    }

    const block = readChildren(lines, i, 0);
    root[kv.key] = block.value;
    i = block.next;
  }

  if (errors.length > 0) return { ok: false, errors };
  return coerceFrontmatter(root);
}

function readChildren(
  lines: string[],
  start: number,
  parentIndent: number,
): { value: unknown[] | Record<string, unknown> | null; next: number } {
  const obj: Record<string, unknown> = {};
  const list: unknown[] = [];
  let isList = false;
  let isObject = false;
  let i = start;
  let childIndent = -1;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i++;
      continue;
    }
    const m = line.match(/^(\s*)(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const indent = (m[1] ?? "").length;
    const content = m[2] ?? "";
    if (indent <= parentIndent) break;
    if (childIndent < 0) childIndent = indent;
    if (indent < childIndent) break;
    if (indent > childIndent) {
      // belongs to a deeper level than expected — let the recursive caller pick it up
      i++;
      continue;
    }

    if (content.startsWith("- ")) {
      isList = true;
      list.push(decodeScalar(content.slice(2)));
      i++;
      continue;
    }

    const kv = matchKeyValue(content);
    if (!kv) {
      i++;
      continue;
    }
    isObject = true;
    if (kv.value !== undefined) {
      obj[kv.key] = decodeScalar(kv.value);
      i++;
      continue;
    }
    const nested = readChildren(lines, i + 1, indent);
    obj[kv.key] = nested.value ?? {};
    i = nested.next;
  }

  if (isList && isObject) {
    return { value: list, next: i }; // list takes precedence on ambiguous mixed input
  }
  if (isList) return { value: list, next: i };
  if (isObject) return { value: obj, next: i };
  return { value: null, next: i };
}

function matchKeyValue(s: string): { key: string; value?: string } | null {
  const m = s.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:(?:\s+(.*))?$/);
  if (!m || m[1] === undefined) return null;
  const key = m[1];
  const rest = m[2];
  if (rest === undefined) return { key };
  return { key, value: rest };
}

function decodeScalar(s: string): unknown {
  const t = s.trim();
  if (t === "" || t === "null" || t === "~") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10);
  if (/^-?\d*\.\d+$/.test(t)) return Number.parseFloat(t);
  return t;
}

function coerceFrontmatter(
  raw: Record<string, unknown>,
): { ok: true; value: StructuredFrontmatter } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const format = typeof raw.format === "string" ? raw.format : "";
  if (!format) errors.push("Frontmatter is missing top-level `format` key");

  const studyRaw = (raw.study ?? {}) as Record<string, unknown>;
  if (!studyRaw || typeof studyRaw !== "object" || Array.isArray(studyRaw)) {
    errors.push("Frontmatter is missing the `study` block");
    return { ok: false, errors };
  }
  const sectorCoverageRaw = studyRaw.sectorCoverage;
  const sectorCoverage = Array.isArray(sectorCoverageRaw)
    ? sectorCoverageRaw.filter((x): x is string => typeof x === "string")
    : [];

  const study: StructuredFrontmatter["study"] = {
    title: typeof studyRaw.title === "string" ? studyRaw.title : "",
    publisher: typeof studyRaw.publisher === "string" ? studyRaw.publisher : undefined,
    publishedAt: typeof studyRaw.publishedAt === "string" ? studyRaw.publishedAt : undefined,
    methodology: typeof studyRaw.methodology === "string" ? studyRaw.methodology : undefined,
    sampleSize: typeof studyRaw.sampleSize === "number" ? studyRaw.sampleSize : undefined,
    geography: typeof studyRaw.geography === "string" ? studyRaw.geography : undefined,
    sectorCoverage,
  };

  const scopingRaw = (raw.scoping ?? {}) as Record<string, unknown>;
  const scoping: StructuredFrontmatter["scoping"] = {
    countryCode: typeof scopingRaw.countryCode === "string" ? scopingRaw.countryCode : undefined,
    sector: typeof scopingRaw.sector === "string" ? scopingRaw.sector : undefined,
    brandNature: typeof scopingRaw.brandNature === "string" ? scopingRaw.brandNature : undefined,
    cascadeLevel: typeof scopingRaw.cascadeLevel === "string" ? scopingRaw.cascadeLevel : undefined,
    period: typeof scopingRaw.period === "string" ? scopingRaw.period : undefined,
  };

  const sourcesRaw = raw.sources;
  const sources = Array.isArray(sourcesRaw)
    ? sourcesRaw.filter((x): x is string => typeof x === "string")
    : undefined;

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, value: { format, study, scoping, sources } };
}

// ── Sections + table parsing ─────────────────────────────────────────

function splitSections(body: string): Map<SectionId, string> {
  const map = new Map<SectionId, string>();
  const headingRe = /^##\s+§(\d+)\b[^\n]*$/gm;
  const matches: Array<{ id: string; start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(body))) {
    matches.push({ id: match[1] ?? "", start: match.index, end: -1 });
  }
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]!;
    const next = matches[i + 1];
    const end = next ? next.start : body.length;
    current.end = end;
    if (current.id in SECTION_SPEC) {
      const id = current.id as SectionId;
      map.set(id, body.slice(current.start, end));
    }
  }
  return map;
}

function parseSectionTable(
  sections: Map<SectionId, string>,
  id: SectionId,
  errors: string[],
  warnings: string[],
): Array<Record<string, string>> {
  const content = sections.get(id);
  if (!content) {
    warnings.push(`Section §${id} (${SECTION_SPEC[id].title}) absent from document`);
    return [];
  }
  const result = parseTable(content, [...SECTION_SPEC[id].headers]);
  if (!result.ok) {
    errors.push(`Section §${id} (${SECTION_SPEC[id].title}) — ${result.error}`);
    return [];
  }
  return result.rows;
}

function parseTable(
  content: string,
  expectedHeaders: string[],
): { ok: true; rows: Array<Record<string, string>> } | { ok: false; error: string } {
  const lines = content.split(/\r?\n/);
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      const next = (lines[i + 1] ?? "").trim();
      if (/^\|(\s*:?-+:?\s*\|)+$/.test(next)) {
        headerIdx = i;
        break;
      }
    }
  }
  if (headerIdx < 0) {
    return { ok: false, error: "no markdown table found" };
  }

  const headerCells = splitRow(lines[headerIdx] ?? "");
  const headerLowercase = headerCells.map((h) => h.toLowerCase());
  const expectedLowercase = expectedHeaders.map((h) => h.toLowerCase());
  if (
    headerLowercase.length !== expectedLowercase.length ||
    !expectedLowercase.every((h, i) => headerLowercase[i] === h)
  ) {
    return {
      ok: false,
      error: `header mismatch — expected [${expectedHeaders.join(", ")}], got [${headerCells.join(", ")}]`,
    };
  }

  const rows: Array<Record<string, string>> = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const line = rawLine.trim();
    if (!line) break;
    if (!line.startsWith("|")) break;
    const cells = splitRow(rawLine);
    if (cells.length !== expectedHeaders.length) {
      return {
        ok: false,
        error: `row ${i - headerIdx - 1} has ${cells.length} cells, expected ${expectedHeaders.length}`,
      };
    }
    const row: Record<string, string> = {};
    for (let j = 0; j < expectedHeaders.length; j++) {
      const colName = expectedHeaders[j];
      const cellValue = cells[j];
      if (colName !== undefined && cellValue !== undefined) row[colName] = cellValue;
    }
    rows.push(row);
  }
  return { ok: true, rows };
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

// ── Cell parsers ─────────────────────────────────────────────────────

function isEmpty(s: string | undefined): boolean {
  if (s === undefined) return true;
  const t = s.trim();
  return t === "" || t === "-" || t.toLowerCase() === "null";
}

function parseString(s: string | undefined): string | undefined {
  if (isEmpty(s)) return undefined;
  return s!.trim();
}

function parseNumber(s: string | undefined, label: string, errors: string[]): number | undefined {
  if (isEmpty(s)) return undefined;
  const n = Number(s!.trim().replace(/,/g, "."));
  if (Number.isNaN(n)) {
    errors.push(`${label}: cannot parse number "${s}"`);
    return undefined;
  }
  return n;
}

function parseInt32(s: string | undefined, label: string, errors: string[]): number | undefined {
  const n = parseNumber(s, label, errors);
  if (n === undefined) return undefined;
  if (!Number.isInteger(n)) {
    errors.push(`${label}: expected integer, got ${n}`);
    return undefined;
  }
  return n;
}

function parseListSemicolon(s: string | undefined): string[] {
  if (isEmpty(s)) return [];
  return s!
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseDemographics(s: string | undefined): Record<string, string> | undefined {
  if (isEmpty(s)) return undefined;
  const out: Record<string, string> = {};
  for (const pair of s!.split(",")) {
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const k = pair.slice(0, eq).trim();
    const v = pair.slice(eq + 1).trim();
    if (k && v) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseCausalChain(s: string | undefined): string[] {
  if (isEmpty(s)) return [];
  return s!
    .split(/->|→/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseEnum<T extends string>(
  s: string | undefined,
  allowed: readonly T[],
  label: string,
  errors: string[],
): T | undefined {
  if (isEmpty(s)) return undefined;
  const t = s!.trim().toUpperCase() as T;
  if (!allowed.includes(t)) {
    errors.push(`${label}: invalid value "${s}", expected one of ${allowed.join(", ")}`);
    return undefined;
  }
  return t;
}

// ── Per-section parsers ──────────────────────────────────────────────

interface TamTriple {
  tam?: { value: number; currency?: string; year: number; methodology?: string; source: string };
  sam?: { value: number; currency?: string; year: number; methodology?: string; source: string };
  som?: { value: number; currency?: string; year: number; methodology?: string; source: string };
}

function parseTamSection(rows: Array<Record<string, string>>, errors: string[]): TamTriple {
  const out: TamTriple = {};
  for (const row of rows) {
    const metric = parseString(row.metric)?.toUpperCase();
    if (!metric) continue;
    const value = parseNumber(row.value, `§1 ${metric}.value`, errors);
    const year = parseInt32(row.year, `§1 ${metric}.year`, errors);
    const source = parseString(row.source);
    if (value === undefined && year === undefined && !source) continue; // empty row, skip silently
    if (value === undefined || year === undefined || !source) {
      if (value !== undefined || year !== undefined || source) {
        errors.push(`§1 ${metric}: value, year and source are all required when any is provided`);
      }
      continue;
    }
    const entry = {
      value,
      year,
      source,
      currency: parseString(row.currency),
      methodology: parseString(row.methodology),
    };
    if (metric === "TAM") out.tam = entry;
    else if (metric === "SAM") out.sam = entry;
    else if (metric === "SOM") out.som = entry;
    else errors.push(`§1: unknown metric "${metric}" — expected TAM, SAM or SOM`);
  }
  return out;
}

function parseGrowthRates(
  rows: Array<Record<string, string>>,
  errors: string[],
): MarketStudyExtraction["growthRates"] {
  const out: MarketStudyExtraction["growthRates"] = [];
  for (const row of rows) {
    const segment = parseString(row.segment);
    const cagr = parseNumber(row.cagr, `§2 cagr`, errors);
    const period = parseString(row.period);
    if (!segment && cagr === undefined && !period) continue;
    if (!segment || cagr === undefined || !period) {
      errors.push(`§2: segment, cagr and period are all required`);
      continue;
    }
    out.push({ segment, cagr, period, source: parseString(row.source) });
  }
  return out;
}

function parseCompetitors(
  rows: Array<Record<string, string>>,
  errors: string[],
): MarketStudyExtraction["competitorShares"] {
  const out: MarketStudyExtraction["competitorShares"] = [];
  for (const row of rows) {
    const name = parseString(row.name);
    const year = parseInt32(row.year, "§3 year", errors);
    if (!name && year === undefined) continue;
    if (!name || year === undefined) {
      errors.push(`§3: name and year are required for each competitor`);
      continue;
    }
    out.push({
      name,
      year,
      marketSharePct: parseNumber(row.marketSharePct, "§3 marketSharePct", errors),
      source: parseString(row.source),
    });
  }
  return out;
}

function parseSegments(
  rows: Array<Record<string, string>>,
  errors: string[],
): MarketStudyExtraction["consumerSegments"] {
  const out: MarketStudyExtraction["consumerSegments"] = [];
  for (const row of rows) {
    const segment = parseString(row.segment);
    const sizePct = parseNumber(row.sizePct, "§4 sizePct", errors);
    if (!segment && sizePct === undefined) continue;
    if (!segment || sizePct === undefined) {
      errors.push(`§4: segment and sizePct are required`);
      continue;
    }
    out.push({
      segment,
      sizePct,
      demographics: parseDemographics(row.demographics),
      behaviors: parseListSemicolon(row.behaviors),
      painPoints: parseListSemicolon(row.painPoints),
    });
  }
  return out;
}

function parsePricePoints(
  rows: Array<Record<string, string>>,
  errors: string[],
): MarketStudyExtraction["pricePoints"] {
  const out: MarketStudyExtraction["pricePoints"] = [];
  for (const row of rows) {
    const tier = parseString(row.tier);
    const range = parseString(row.range);
    const asp = parseNumber(row.asp, "§5 asp", errors);
    const source = parseString(row.source);
    if (!tier && !range && asp === undefined && !source) continue;
    if (!tier) {
      errors.push(`§5: tier is required`);
      continue;
    }
    out.push({ tier, range, asp, source });
  }
  return out;
}

function parseChannelMix(
  rows: Array<Record<string, string>>,
  errors: string[],
): MarketStudyExtraction["channelMix"] {
  const out: MarketStudyExtraction["channelMix"] = [];
  for (const row of rows) {
    const channel = parseString(row.channel);
    const sharePct = parseNumber(row.sharePct, "§6 sharePct", errors);
    if (!channel && sharePct === undefined) continue;
    if (!channel || sharePct === undefined) {
      errors.push(`§6: channel and sharePct are required`);
      continue;
    }
    out.push({ channel, sharePct, growthTrend: parseString(row.growthTrend) });
  }
  return out;
}

function parseRegulatory(
  rows: Array<Record<string, string>>,
  errors: string[],
): MarketStudyExtraction["regulatorySignals"] {
  const out: MarketStudyExtraction["regulatorySignals"] = [];
  const allowed = ["LOW", "MEDIUM", "HIGH"] as const;
  for (const row of rows) {
    const regulation = parseString(row.regulation);
    const impactSeverity = parseEnum(row.impactSeverity, allowed, "§7 impactSeverity", errors);
    if (!regulation && !impactSeverity) continue;
    if (!regulation || !impactSeverity) {
      errors.push(`§7: regulation and impactSeverity are required`);
      continue;
    }
    out.push({ regulation, impactSeverity, timeline: parseString(row.timeline) });
  }
  return out;
}

function parseMacro(
  rows: Array<Record<string, string>>,
  errors: string[],
): MarketStudyExtraction["macroSignals"] {
  const out: MarketStudyExtraction["macroSignals"] = [];
  const allowed = ["SHORT", "MEDIUM", "LONG"] as const;
  for (const row of rows) {
    const trend = parseString(row.trend);
    const evidence = parseString(row.evidence);
    if (!trend && !evidence) continue;
    if (!trend || !evidence) {
      errors.push(`§8: trend and evidence are required`);
      continue;
    }
    out.push({ trend, evidence, timeHorizon: parseEnum(row.timeHorizon, allowed, "§8 timeHorizon", errors) });
  }
  return out;
}

function parseWeakSignals(
  rows: Array<Record<string, string>>,
  errors: string[],
): MarketStudyExtraction["weakSignals"] {
  const out: MarketStudyExtraction["weakSignals"] = [];
  const allowed = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
  for (const row of rows) {
    const event = parseString(row.event);
    const impactCategory = parseString(row.impactCategory);
    if (!event && !impactCategory) continue;
    if (!event || !impactCategory) {
      errors.push(`§9: event and impactCategory are required`);
      continue;
    }
    out.push({
      event,
      causalChain: parseCausalChain(row.causalChain),
      impactCategory,
      urgency: parseEnum(row.urgency, allowed, "§9 urgency", errors),
    });
  }
  return out;
}

function parseTrendTracker(
  rows: Array<Record<string, string>>,
  errors: string[],
): NonNullable<MarketStudyExtraction["trendTracker"]> {
  const out: NonNullable<MarketStudyExtraction["trendTracker"]> = {};
  for (const row of rows) {
    const code = parseString(row.code);
    if (!code) continue;
    const valueRaw = row.value;
    if (isEmpty(valueRaw)) continue; // anti-fab : value missing → skip whole row
    const trimmed = (valueRaw ?? "").trim();
    const numeric = Number(trimmed.replace(/,/g, "."));
    const value: number | string = Number.isNaN(numeric) ? trimmed : numeric;
    const year = parseInt32(row.year, `§10 ${code}.year`, errors);
    const source = parseString(row.source);
    const confidence = parseNumber(row.confidence, `§10 ${code}.confidence`, errors);
    out[code] = { value, year, source, confidence };
  }
  return out;
}

// ── Misc helpers ─────────────────────────────────────────────────────

function isPlaceholder(s: string | undefined): boolean {
  if (!s) return true;
  const t = s.trim();
  return t === "" || /^REMPLIR\b/i.test(t) || t === "XX" || t === "YYYY-MM-DD";
}

function discardPlaceholder(s: string | undefined): string | undefined {
  if (isPlaceholder(s)) return undefined;
  return s;
}
