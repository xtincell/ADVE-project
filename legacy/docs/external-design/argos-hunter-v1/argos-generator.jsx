import React, { useState, useRef, useEffect } from 'react';
import { Eye, Search, FileJson, Download, Copy, AlertCircle, CheckCircle2, Loader2, Circle, ChevronDown, ChevronRight, Sparkles, Terminal, Database, Trash2, RefreshCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ARGOS — Campaign Intelligence Harvester
// research-dossier-v1 generator
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_REFERENCE = {
  campaign: `{
  "brand": string (CANONICAL SHORT NAME — "Apple" not "Apple Inc.", "Nike" not "Nike Inc." — critical: brand-UID derives from this),
  "year": number,
  "slug": string (kebab-case CAMPAIGN slug only — e.g. "think-different", NOT "apple-think-different-1997"),
  "title": string,
  "agency": string | null,
  "markets": string[] (ISO country codes or region names),
  "confidence": "high" | "medium" | "low",
  "sources": [{"sourceUrl": string, "excerpt": string (verbatim, <200 chars)}],
  "notes": string | null
}`,
  asset: `{
  "id": string (kebab-case SHORT slug, brand-and-year-free — e.g. "heres-to-the-crazy-ones", NOT "apple-tvc-1997"),
  "kind": "image" | "video" | "text" | "audio",
  "function": string (e.g. "billboard", "tvc", "print", "social", "ooh", "tagline"),
  "url": string | null,
  "dna": object (schema depends on kind, see DNA_SCHEMAS),
  "sources": [{"sourceUrl": string, "excerpt": string}]
}`,
  sidecar: `[{
  "targetType": "brand" | "campaign" | "asset",
  "targetCreateHints": {
    "brand": string,
    "campaign": string | null (campaign slug, required for campaign/asset targets),
    "year": number | null (required for campaign/asset targets),
    "assetId": string | null (kebab-case, required only for asset targets),
    "kind": string | null (image/video/text/audio, required only for asset targets)
  },
  "finding": {
    "type": "asset_mention" | "fact" | "performance" | "victory" | "axis" | "context",
    "content": string (one-sentence summary),
    "sourceUrl": string,
    "excerpt": string (verbatim, <200 chars)
  }
}]`,
  dnaImage: `{ "composition": string, "palette": string[] (hex or names), "typography": string, "subjects": string[], "mood": string, "visualCodes": string[] }`,
  dnaVideo: `{ "durationSec": number | "uncertain", "structure": string, "music": string, "voiceover": string | null, "scenes": string[], "pacing": "slow" | "medium" | "fast" }`,
  dnaText: `{ "tone": string, "structure": string, "keyPhrases": string[], "length": "tagline" | "short" | "long", "voice": string }`,
  dnaAudio: `{ "format": string, "durationSec": number | "uncertain", "musicStyle": string, "voice": string | null }`,
  axes: `[{"name": string, "description": string, "evidence": [{"sourceUrl": string, "excerpt": string}]}]`,
  performance: `[{"metric": string, "value": string, "evidenceLevel": "ANECDOTAL" | "REPORTED" | "PROVEN_CAUSAL", "sources": [{"sourceUrl": string, "excerpt": string}]}]`,
  victories: `[{"type": "award" | "recognition" | "cultural_impact", "title": string, "year": number, "sources": [{"sourceUrl": string, "excerpt": string}]}]`,
  editorial: `{ "summary": string (200-400 chars), "patternObservation": string (one cross-asset pattern, 100-300 chars), "significance": string (why it matters now, 100-300 chars) }`,
  safety: `{ "verdict": "PASS" | "QUARANTINE" | "REJECT", "reasons": string[], "uncertainFields": string[] }`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Common JSON discipline — injected into every phase prompt to prevent the
// #1 LLM failure mode: unescaped double-quotes inside verbatim excerpts.
// ─────────────────────────────────────────────────────────────────────────────

const JSON_DISCIPLINE = `

JSON OUTPUT DISCIPLINE (non-negotiable — your output is parsed by JSON.parse, not by a human):

ABSOLUTE RULE FOR EXCERPTS: NEVER use the character " (double quote) inside any string value. If a source contains quoted text:
- DO NOT escape with \\" — that's brittle
- DO NOT keep the quote — that's forbidden
- DO paraphrase to remove the quote, OR replace " with ' (apostrophe / single quote) inside the excerpt
- Example: source says: He said "innovation drives growth"
  → Your excerpt: He said 'innovation drives growth' (single quotes substituted)
  → OR: He said innovation drives growth (paraphrased to remove quotes)

ALSO:
- No literal newlines or tabs inside string values
- No trailing commas before } or ]
- No comments. No preamble. No postamble. ONLY the JSON block wrapped in \`\`\`json ... \`\`\`.
- Before finalizing your output, mentally JSON.parse() each string value — if any contains an unescaped ", REWRITE IT.

Keeping the JSON valid takes priority over verbatim purity. Always.
`;

// ─────────────────────────────────────────────────────────────────────────────
// UID system — canonical, deterministic, hierarchical, computed client-side
// ─────────────────────────────────────────────────────────────────────────────

function slugify(s) {
  if (!s && s !== 0) return '';
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function brandUid(brand) {
  const s = slugify(brand);
  return s ? `brand:${s}` : null;
}
function campaignUid(brand, slug, year) {
  const b = slugify(brand), c = slugify(slug);
  if (!b || !c || !year) return null;
  return `campaign:${b}.${c}.${year}`;
}
function assetUid(brand, campaignSlug, year, assetId, kind) {
  const b = slugify(brand), c = slugify(campaignSlug), a = slugify(assetId), k = slugify(kind);
  if (!b || !c || !year || !a || !k) return null;
  return `asset:${b}.${c}.${year}.${k}-${a}`;
}

function enrichSidecar(finding) {
  const h = finding?.targetCreateHints || {};
  let targetUid = null;
  if (finding?.targetType === 'brand' && h.brand) {
    targetUid = brandUid(h.brand);
  } else if (finding?.targetType === 'campaign' && h.brand && h.campaign && h.year) {
    targetUid = campaignUid(h.brand, h.campaign, h.year);
  } else if (finding?.targetType === 'asset' && h.brand && h.campaign && h.year && h.assetId && h.kind) {
    targetUid = assetUid(h.brand, h.campaign, h.year, h.assetId, h.kind);
  }
  return { ...finding, targetUid };
}

// Strip internal-only fields (double-underscore prefix) from a dossier before
// export, storage, or display. The dossier contract is rigid — only schema fields ship.
function cleanForExport(d) {
  if (!d || typeof d !== 'object') return d;
  const cleanFinding = (sc) => {
    if (!sc || typeof sc !== 'object') return sc;
    const out = {};
    for (const k of Object.keys(sc)) {
      if (!k.startsWith('__')) out[k] = sc[k];
    }
    return out;
  };
  return {
    ...d,
    sidecarFindings: Array.isArray(d.sidecarFindings) ? d.sidecarFindings.map(cleanFinding) : d.sidecarFindings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage wrapper — uses window.storage (persistent), degrades gracefully
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// JSON repair — handles common LLM output defects locally (no retry to LLM)
// ─────────────────────────────────────────────────────────────────────────────

function escapeInnerQuotes(s) {
  let out = '';
  let inString = false;
  let i = 0;
  while (i < s.length) {
    const c = s[i];

    if (!inString) {
      out += c;
      if (c === '"') inString = true;
      i++;
      continue;
    }

    // Inside a string
    if (c === '\\' && i + 1 < s.length) {
      // Preserve the existing escape sequence as-is (\", \\, \n, \uXXXX, etc.)
      out += c + s[i + 1];
      i += 2;
      continue;
    }

    if (c === '"') {
      // Lookahead: is this the string closer or an inner quote?
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      const next = s[j];
      // Closer if followed by structural char or end-of-input
      if (j >= s.length || next === ',' || next === '}' || next === ']' || next === ':') {
        inString = false;
        out += c;
      } else {
        // Unescaped inner quote — escape it
        out += '\\"';
      }
      i++;
      continue;
    }

    if (c === '\n') { out += '\\n'; i++; continue; }
    if (c === '\r') { out += '\\r'; i++; continue; }
    if (c === '\t') { out += '\\t'; i++; continue; }

    out += c;
    i++;
  }
  return out;
}

function tryRepairJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();

  // Strip markdown fences if any leaked through
  s = s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '');

  // Strip control characters that aren't \n \r \t
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  // Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, '$1');

  // Pass 1: try as-is
  try { return JSON.parse(s); } catch (_) {}

  // Pass 2: escape unescaped inner quotes + literal newlines/tabs inside strings
  const escaped = escapeInnerQuotes(s);
  try { return JSON.parse(escaped); } catch (_) {}

  // Pass 3: try the escaped version with trailing-comma cleanup re-applied
  const recleanup = escaped.replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(recleanup); } catch (_) {}

  // Pass 4: truncation rescue — if output was cut off mid-string, try closing the string
  // and bracket-balancing. Most common when max_tokens hit on the last response.
  const rescued = rescueTruncated(escaped);
  if (rescued) {
    try { return JSON.parse(rescued); } catch (_) {}
  }

  return null;
}

// Best-effort recovery for max_tokens truncation: close the open string (if any),
// then balance braces/brackets by appending closers.
function rescueTruncated(s) {
  if (!s) return null;

  // Walk the string to determine: are we currently inside a string? What's the brace depth?
  let inString = false;
  let i = 0;
  const stack = []; // tracks '{' and '['
  while (i < s.length) {
    const c = s[i];
    if (inString) {
      if (c === '\\' && i + 1 < s.length) { i += 2; continue; }
      if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') { inString = true; i++; continue; }
    if (c === '{' || c === '[') stack.push(c);
    if (c === '}' || c === ']') stack.pop();
    i++;
  }

  let patched = s;
  // Close an open string
  if (inString) patched += '"';
  // Strip any trailing comma before closing
  patched = patched.replace(/,\s*$/, '');
  // Close any open structures, in reverse order of opening
  while (stack.length) {
    const open = stack.pop();
    patched += open === '{' ? '}' : ']';
  }
  return patched;
}

function extractJsonText(allText) {
  const fenced = allText.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  const first = allText.indexOf('{');
  const last = allText.lastIndexOf('}');
  if (first !== -1 && last > first) return allText.slice(first, last + 1);
  return null;
}

const storage = {
  available() { return typeof window !== 'undefined' && !!window.storage; },
  async get(key) {
    if (!this.available()) return null;
    try {
      const r = await window.storage.get(key);
      return r?.value ? JSON.parse(r.value) : null;
    } catch (e) { return null; }
  },
  async set(key, value) {
    if (!this.available()) return false;
    if (key.length > 199) return false;
    try {
      await window.storage.set(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  },
  async list(prefix) {
    if (!this.available()) return [];
    try {
      const r = await window.storage.list(prefix);
      return r?.keys || [];
    } catch (e) { return []; }
  },
  async del(key) {
    if (!this.available()) return false;
    try { await window.storage.delete(key); return true; } catch (e) { return false; }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry projection — pure function: dossiers → in-memory views.
// The dossier is the only source of truth. Everything else is derived.
// ─────────────────────────────────────────────────────────────────────────────

function projectRegistry(dossiers) {
  const brandsMap = new Map();
  const campaignsMap = new Map();
  const assetsMap = new Map();
  const mentionsByTargetUid = new Map();

  for (const d of dossiers) {
    const dDate = d.completedAt || d.generatedAt || '';

    // BRANDS — dedupe by brandUid, aggregate campaigns + dossiers
    if (d.brandUid && d.campaign?.brand) {
      const ex = brandsMap.get(d.brandUid);
      if (!ex) {
        brandsMap.set(d.brandUid, {
          uid: d.brandUid,
          displayName: d.campaign.brand,
          campaignUids: new Set([d.campaignUid].filter(Boolean)),
          dossierIds: new Set([d.id].filter(Boolean)),
          firstSeenAt: d.generatedAt,
          lastUpdatedAt: dDate,
        });
      } else {
        if (d.campaignUid) ex.campaignUids.add(d.campaignUid);
        if (d.id) ex.dossierIds.add(d.id);
        if (dDate > ex.lastUpdatedAt) ex.lastUpdatedAt = dDate;
        if (d.generatedAt < ex.firstSeenAt) ex.firstSeenAt = d.generatedAt;
      }
    }

    // CAMPAIGNS — keyed by campaignUid; latest dossier wins for canonical view
    if (d.campaignUid) {
      const ex = campaignsMap.get(d.campaignUid);
      if (!ex) {
        campaignsMap.set(d.campaignUid, {
          uid: d.campaignUid,
          brandUid: d.brandUid,
          campaign: d.campaign,
          dossierIds: new Set([d.id].filter(Boolean)),
          latestDossierId: d.id,
          assetUids: (d.assets || []).map((a) => a.uid).filter(Boolean),
          axes: d.axes || [],
          performance: d.performance || [],
          victories: d.victories || [],
          editorial: d.editorial,
          safety: d.safety,
          lastUpdatedAt: dDate,
        });
      } else {
        if (d.id) ex.dossierIds.add(d.id);
        if (dDate > ex.lastUpdatedAt) {
          ex.campaign = d.campaign;
          ex.latestDossierId = d.id;
          ex.assetUids = (d.assets || []).map((a) => a.uid).filter(Boolean);
          ex.axes = d.axes || [];
          ex.performance = d.performance || [];
          ex.victories = d.victories || [];
          ex.editorial = d.editorial;
          ex.safety = d.safety;
          ex.lastUpdatedAt = dDate;
        }
      }
    }

    // ASSETS — flatten from all dossiers, latest wins per UID
    for (const a of (d.assets || [])) {
      if (!a.uid) continue;
      const ex = assetsMap.get(a.uid);
      if (!ex) {
        assetsMap.set(a.uid, {
          uid: a.uid,
          brandUid: d.brandUid,
          campaignUid: d.campaignUid,
          data: a,
          dossierIds: new Set([d.id].filter(Boolean)),
          lastSeenAt: dDate,
        });
      } else {
        if (d.id) ex.dossierIds.add(d.id);
        if (dDate > ex.lastSeenAt) {
          ex.data = a;
          ex.lastSeenAt = dDate;
        }
      }
    }

    // MENTIONS — aggregate sidecar findings by target UID across all dossiers
    for (const sc of (d.sidecarFindings || [])) {
      if (!sc.targetUid) continue;
      const list = mentionsByTargetUid.get(sc.targetUid) || [];
      list.push({
        ...sc,
        sourceDossierId: d.id,
        sourceCampaignUid: d.campaignUid,
        sourceCampaignTitle: d.campaign?.title || d.campaign?.slug,
        sourceBrand: d.campaign?.brand,
        encounteredAt: dDate,
      });
      mentionsByTargetUid.set(sc.targetUid, list);
    }
  }

  // Serialize sets → arrays for React consumption
  const brands = Array.from(brandsMap.values()).map((b) => ({
    ...b,
    campaignUids: Array.from(b.campaignUids),
    dossierIds: Array.from(b.dossierIds),
  })).sort((a, b) => (b.lastUpdatedAt || '').localeCompare(a.lastUpdatedAt || ''));

  const campaigns = Array.from(campaignsMap.values()).map((c) => ({
    ...c,
    dossierIds: Array.from(c.dossierIds),
  })).sort((a, b) => (b.lastUpdatedAt || '').localeCompare(a.lastUpdatedAt || ''));

  const assets = Array.from(assetsMap.values()).map((a) => ({
    ...a,
    dossierIds: Array.from(a.dossierIds),
  })).sort((a, b) => (b.lastSeenAt || '').localeCompare(a.lastSeenAt || ''));

  // Resolve mention status: is the target UID already covered by a primary dossier?
  const primaryUids = new Set([
    ...brandsMap.keys(),
    ...campaignsMap.keys(),
    ...assetsMap.keys(),
  ]);

  const mentions = Array.from(mentionsByTargetUid.entries())
    .map(([targetUid, items]) => ({
      targetUid,
      targetType: items[0]?.targetType,
      hasprimaryCoverage: primaryUids.has(targetUid),
      count: items.length,
      items: items.sort((a, b) => (b.encounteredAt || '').localeCompare(a.encounteredAt || '')),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    brands,
    campaigns,
    assets,
    mentions,
    loading: false,
    unavailable: false,
    dossierCount: dossiers.length,
  };
}

const PHASE_PROMPTS = {
  1: `You are ARGOS HUNTER — Phase 1: QUERY PARSING + CAMPAIGN IDENTIFICATION.

Input: a free-form natural language query (any language — FR/EN/mixed). May be precise, vague, descriptive, contain a URL, or be partially wrong.

Task: PARSE → DISAMBIGUATE → IDENTIFY the campaign.

CRITICAL RULES:
- Use web_search aggressively. Start broad, then narrow.
- BRAND CANONICALIZATION is critical — the UID system depends on it:
    * Use the CANONICAL SHORT NAME everywhere ("Apple" not "Apple Inc." not "AAPL"; "Nike" not "Nike Inc."; "Coca-Cola" not "The Coca-Cola Company")
    * Be consistent: the same brand must produce the same string in every dossier
- DISAMBIGUATION: if multiple plausible campaigns match, pick the most likely AND list alternatives in campaign.notes.
- If >2 strong candidates → confidence: "low" + candidates in notes.
- Try to find ONE canonical asset URL → "resolvedAssetUrl".
- Every field needs sourceUrl + verbatim excerpt OR explicit "uncertain".
- NEVER invent. Excerpts: VERBATIM, ≤200 chars.
- slug: CAMPAIGN slug only, kebab-case, brand-and-year-free (e.g. "think-different" — NOT "apple-think-different-1997"). UID derives from brand + slug + year as separate fields.
- SIDECAR FINDINGS: if during your search you encounter notable info about OTHER campaigns or brands (competing campaign mentioned in same article, predecessor referenced, etc.), emit them in sidecarFindings. Max 3 per phase. Each requires a verbatim sourced excerpt.
- Output ONLY ONE JSON block.

OUTPUT SCHEMA:
\`\`\`json
{
  "queryInterpretation": string (one sentence: how you parsed the query),
  "resolvedAssetUrl": string | null,
  "campaign": ${SCHEMA_REFERENCE.campaign},
  "sidecarFindings": ${SCHEMA_REFERENCE.sidecar}
}
\`\`\`
${JSON_DISCIPLINE}
Begin.`,

  2: `You are ARGOS HUNTER — Phase 2: ASSETS + DNA EXTRACTION.

Context: campaign already identified (provided in user message).
Task: list canonical assets of this campaign, extract DNA per asset.

RULES:
- Use web_search to find canonical assets (billboards, TVCs, prints, social posts, taglines, jingles).
- Max 6 assets. Pick the most iconic if more exist.
- For each asset:
    * id: kebab-case SHORT slug, brand/year/campaign-free (e.g. "heres-to-the-crazy-ones" — NOT "apple-tvc-1997-crazy-ones"). The UID will be derived hierarchically: asset:{brand}.{campaign}.{year}.{kind}-{id}
    * DNA block matching kind
    * Every claim: sourceUrl + verbatim excerpt OR "uncertain"
- SIDECAR: if you find info about OTHER campaigns/brands ("this asset was a response to Nike's 1996 campaign X", "this was the prototype for [other campaign]"), emit them. Max 3. Each must include targetCreateHints (brand/campaign/year/assetId/kind as relevant to target).

DNA SCHEMAS by kind:
- image: ${SCHEMA_REFERENCE.dnaImage}
- video: ${SCHEMA_REFERENCE.dnaVideo}
- text:  ${SCHEMA_REFERENCE.dnaText}
- audio: ${SCHEMA_REFERENCE.dnaAudio}

OUTPUT SCHEMA:
\`\`\`json
{
  "assets": [ ${SCHEMA_REFERENCE.asset} ],
  "sidecarFindings": ${SCHEMA_REFERENCE.sidecar}
}
\`\`\`
${JSON_DISCIPLINE}
Begin.`,

  3: `You are ARGOS HUNTER — Phase 3: STRATEGIC AXES + PERFORMANCE + VICTORIES.

Context: campaign + assets identified.
Task: extract strategic axes, performance metrics, victories.

RULES:
- AXES = 2-4 strategic pillars MAX. With evidence.
- PERFORMANCE = quantitative metrics ONLY. evidenceLevel:
    * ANECDOTAL = self-reported, no method
    * REPORTED = tracked but no control
    * PROVEN_CAUSAL = controlled study / A-B / econometric model
  Default to REPORTED unless source explicitly describes controls. PROVEN_CAUSAL must cite study methodology.
- VICTORIES = awards (Cannes Lions, D&AD, Effie, Clio…), recognition, cultural impact. With year + source.
- If no data found → empty arrays. NEVER fabricate.
- SIDECAR: if you encounter performance data, awards, or strategic axes for OTHER campaigns during search, emit them. Max 3.

OUTPUT SCHEMA:
\`\`\`json
{
  "axes": ${SCHEMA_REFERENCE.axes},
  "performance": ${SCHEMA_REFERENCE.performance},
  "victories": ${SCHEMA_REFERENCE.victories},
  "sidecarFindings": ${SCHEMA_REFERENCE.sidecar}
}
\`\`\`
${JSON_DISCIPLINE}
Begin.`,

  4: `You are ARGOS HUNTER — Phase 4: EDITORIAL SYNTHESIS + SAFETY AUDIT.

Context: full dossier draft provided.
Task: write editorial block + run safety audit.

EDITORIAL:
- summary: what the campaign IS, strategic intent. 200-400 chars.
- patternObservation: one cross-asset signature device. 100-300 chars.
- significance: why it matters NOW for a practitioner. 100-300 chars.

SAFETY AUDIT:
- verdict: PASS = publishable; QUARANTINE = retry-able gaps; REJECT = critical fabrication risk
- reasons: list each issue (citation gaps, low-confidence claims, contradictions, suspicious metrics)
- uncertainFields: dot-path list (e.g. "campaign.agency", "assets[2].dna.durationSec")
- UID CONSISTENCY CHECK (critical): flag if brand naming is inconsistent across the dossier ("Apple" in one place, "Apple Inc." in another) — this fragments the UID registry. Report in reasons.
- Be brutally honest. Too many gaps → QUARANTINE.

OUTPUT SCHEMA:
\`\`\`json
{
  "editorial": ${SCHEMA_REFERENCE.editorial},
  "safety": ${SCHEMA_REFERENCE.safety}
}
\`\`\`
${JSON_DISCIPLINE}
Begin.`,
};

const PHASE_META = {
  1: { name: 'Campaign ID', icon: Eye, desc: 'Identification du dossier' },
  2: { name: 'Assets + DNA', icon: Sparkles, desc: 'Extraction de l\'ADN par asset' },
  3: { name: 'Axes · Perf · Wins', icon: Search, desc: 'Stratégie, métriques, palmarès' },
  4: { name: 'Editorial + Safety', icon: Terminal, desc: 'Synthèse + audit' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Core: phase runner
// ─────────────────────────────────────────────────────────────────────────────

// ─── API endpoint: local proxy in dev, real Anthropic in claude.ai artifact ───
const ANTHROPIC_ENDPOINT = (typeof window !== 'undefined' && window.location?.hostname === 'localhost')
  ? '/api/anthropic/v1/messages'
  : 'https://api.anthropic.com/v1/messages';

// ─── Per-phase tool schemas — model emits structured output via tool_use ──────
// This is the big win: no more JSON text parsing, no more escape gymnastics.
const SUBMIT_TOOLS = {
  1: {
    name: 'submit_phase_output',
    description: 'Submit Phase 1 output (campaign identification). Call this exactly once when research is done.',
    input_schema: {
      type: 'object',
      properties: {
        queryInterpretation: { type: 'string' },
        resolvedAssetUrl: { type: ['string', 'null'] },
        campaign: {
          type: 'object',
          properties: {
            brand: { type: 'string' },
            year: { type: 'number' },
            slug: { type: 'string' },
            title: { type: 'string' },
            agency: { type: ['string', 'null'] },
            markets: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            sources: { type: 'array' },
            notes: { type: ['string', 'null'] }
          },
          required: ['brand', 'year', 'slug', 'title', 'confidence', 'sources']
        },
        sidecarFindings: { type: 'array' }
      },
      required: ['campaign', 'sidecarFindings']
    }
  },
  2: {
    name: 'submit_phase_output',
    description: 'Submit Phase 2 output (assets + DNA).',
    input_schema: {
      type: 'object',
      properties: { assets: { type: 'array' }, sidecarFindings: { type: 'array' } },
      required: ['assets', 'sidecarFindings']
    }
  },
  3: {
    name: 'submit_phase_output',
    description: 'Submit Phase 3 output (axes, performance, victories).',
    input_schema: {
      type: 'object',
      properties: { axes: { type: 'array' }, performance: { type: 'array' }, victories: { type: 'array' }, sidecarFindings: { type: 'array' } },
      required: ['axes', 'performance', 'victories', 'sidecarFindings']
    }
  },
  4: {
    name: 'submit_phase_output',
    description: 'Submit Phase 4 output (editorial + safety audit).',
    input_schema: {
      type: 'object',
      properties: {
        editorial: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            patternObservation: { type: 'string' },
            significance: { type: 'string' }
          },
          required: ['summary', 'patternObservation', 'significance']
        },
        safety: {
          type: 'object',
          properties: {
            verdict: { type: 'string', enum: ['PASS', 'QUARANTINE', 'REJECT'] },
            reasons: { type: 'array', items: { type: 'string' } },
            uncertainFields: { type: 'array', items: { type: 'string' } }
          },
          required: ['verdict', 'reasons', 'uncertainFields']
        }
      },
      required: ['editorial', 'safety']
    }
  }
};

async function runPhase(systemPrompt, userMessage, onEvent, phaseNum) {
  const messages = [{ role: 'user', content: userMessage }];
  let iterations = 0;
  const MAX_ITER = 6;

  const submitTool = SUBMIT_TOOLS[phaseNum];

  while (iterations < MAX_ITER) {
    iterations++;
    onEvent({ type: 'api_call', iter: iterations });

    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        // ★ FIX 1/4 — modèle récent (was: claude-sonnet-4-20250514, possibly deprecated)
        model: 'claude-sonnet-4-5',
        // ★ FIX 2/4 — assez de tokens pour un dossier complet (was: 1000 = systematic truncation)
        max_tokens: 8192,
        system: systemPrompt,
        tools: [
          // ★ FIX 3/4 — search budget réaliste (was: 5)
          { type: 'web_search_20250305', name: 'web_search', max_uses: 10 },
          // ★ FIX 4/4 — output structuré via tool_use, plus de text-parsing
          submitTool
        ],
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();

    let submittedOutput = null;
    for (const block of data.content) {
      if (block.type === 'server_tool_use' && block.name === 'web_search') {
        onEvent({ type: 'search', query: block.input?.query || '?' });
      } else if (block.type === 'web_search_tool_result') {
        const count = Array.isArray(block.content) ? block.content.length : 0;
        onEvent({ type: 'search_result', count });
      } else if (block.type === 'text') {
        onEvent({ type: 'text', text: block.text });
      } else if (block.type === 'tool_use' && block.name === 'submit_phase_output') {
        // ★ THE WIN: input is already a validated JS object. No JSON parsing. No escape repair.
        submittedOutput = block.input;
        onEvent({ type: 'text', text: '✓ submit_phase_output called — output structured' });
      }
    }

    messages.push({ role: 'assistant', content: data.content });

    if (submittedOutput) return submittedOutput;

    // No more "resume mid-stream" anti-pattern — fail fast if budget too small.
    if (data.stop_reason === 'max_tokens') {
      const err = new Error('Phase exceeded max_tokens before calling submit_phase_output. Increase max_tokens or split the phase.');
      err.rawOutput = JSON.stringify(data, null, 2);
      throw err;
    }

    if (data.stop_reason === 'end_turn') {
      // Model finished without calling the submit tool — prompt it once more.
      messages.push({
        role: 'user',
        content: 'You ended the turn without calling submit_phase_output. Call it now with your research output. Do not produce additional text — only the tool call.'
      });
      continue;
    }
    // stop_reason === 'tool_use' for web_search — loop continues
  }

  const err = new Error('Phase did not call submit_phase_output within iteration budget.');
  err.rawOutput = JSON.stringify(messages, null, 2);
  throw err;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  pending: 'text-stone-600',
  active: 'text-amber-500',
  complete: 'text-emerald-500',
  error: 'text-red-500',
};

function PhaseRow({ num, status, log, expanded, onToggle }) {
  const Icon = PHASE_META[num].icon;
  const StatusIcon = status === 'active' ? Loader2 : status === 'complete' ? CheckCircle2 : status === 'error' ? AlertCircle : Circle;

  return (
    <div className="border-b border-stone-800/60 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-900/40 transition-colors text-left"
      >
        <span className={`text-xs tabular-nums font-mono ${STATUS_COLOR[status]}`}>0{num}</span>
        <StatusIcon className={`w-4 h-4 ${STATUS_COLOR[status]} ${status === 'active' ? 'animate-spin' : ''}`} />
        <Icon className="w-4 h-4 text-stone-400" />
        <div className="flex-1 min-w-0">
          <div className="text-stone-200 text-sm font-mono tracking-tight">{PHASE_META[num].name}</div>
          <div className="text-stone-500 text-xs">{PHASE_META[num].desc}</div>
        </div>
        {log.length > 0 && (
          <span className="text-xs text-stone-500 font-mono">{log.length} events</span>
        )}
        {expanded ? <ChevronDown className="w-4 h-4 text-stone-500" /> : <ChevronRight className="w-4 h-4 text-stone-500" />}
      </button>
      {expanded && log.length > 0 && (
        <div className="px-4 pb-3 pl-14 space-y-1 max-h-48 overflow-y-auto">
          {log.map((evt, i) => (
            <LogLine key={i} evt={evt} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogLine({ evt }) {
  if (evt.type === 'search') {
    return (
      <div className="flex items-baseline gap-2 text-xs font-mono">
        <span className="text-amber-600/80">→</span>
        <span className="text-stone-500">web_search</span>
        <span className="text-stone-300 truncate">{evt.query}</span>
      </div>
    );
  }
  if (evt.type === 'search_result') {
    return (
      <div className="flex items-baseline gap-2 text-xs font-mono text-stone-600">
        <span>↳</span>
        <span>{evt.count} résultats</span>
      </div>
    );
  }
  if (evt.type === 'api_call') {
    return (
      <div className="flex items-baseline gap-2 text-xs font-mono text-stone-600">
        <span>·</span>
        <span>API call #{evt.iter}</span>
      </div>
    );
  }
  if (evt.type === 'text') {
    return (
      <div className="text-xs font-mono text-stone-600 italic truncate">
        ⋯ {evt.text.slice(0, 80)}{evt.text.length > 80 ? '…' : ''}
      </div>
    );
  }
  if (evt.type === 'error') {
    return (
      <div className="text-xs font-mono text-red-400">
        ✕ {evt.message}
      </div>
    );
  }
  return null;
}

export default function ArgosGenerator() {
  const [query, setQuery] = useState('');

  const [running, setRunning] = useState(false);
  const [phases, setPhases] = useState({ 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending' });
  const [logs, setLogs] = useState({ 1: [], 2: [], 3: [], 4: [] });
  const [expanded, setExpanded] = useState({ 1: true, 2: false, 3: false, 4: false });
  const [dossier, setDossier] = useState(null);
  const [error, setError] = useState(null); // { message, phase, rawOutput?, rawJsonAttempt? }
  const [copied, setCopied] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const builtRef = useRef(null); // partial dossier state, used for retry-from-phase

  const [registry, setRegistry] = useState({ brands: [], campaigns: [], assets: [], mentions: [], loading: true, unavailable: false, dossierCount: 0 });
  const [registryOpen, setRegistryOpen] = useState(false);
  const [registryTab, setRegistryTab] = useState('brands');

  const dossierRef = useRef(null);

  // Keep builtRef in sync with dossier state — defense against ref loss across renders
  useEffect(() => {
    if (dossier) builtRef.current = dossier;
  }, [dossier]);

  useEffect(() => {
    refreshRegistry();
  }, []);

  // ─── Compute registry views by scanning all dossiers in storage ──────────
  async function refreshRegistry() {
    if (!storage.available()) {
      setRegistry({ brands: [], campaigns: [], assets: [], mentions: [], loading: false, unavailable: true, dossierCount: 0 });
      return;
    }
    setRegistry((r) => ({ ...r, loading: true }));

    const dossierKeys = await storage.list('dossier:');
    const dossiers = (await Promise.all(dossierKeys.map((k) => storage.get(k)))).filter(Boolean);

    setRegistry(projectRegistry(dossiers));
  }

  async function persistDossier(d) {
    if (!storage.available() || !d.id) return;
    // Strip internal fields — storage must contain schema-compliant dossiers only
    await storage.set(`dossier:${d.id}`, cleanForExport(d));
    await refreshRegistry();
  }

  async function deleteDossier(dossierId) {
    if (!storage.available()) return;
    await storage.del(`dossier:${dossierId}`);
    await refreshRegistry();
  }

  async function clearDossiers() {
    if (!confirm('Effacer tous les dossiers Argos stockés ? Action irréversible.')) return;
    const keys = await storage.list('dossier:');
    for (const k of keys) await storage.del(k);
    await refreshRegistry();
  }

  function addLog(phase, evt) {
    setLogs((prev) => ({ ...prev, [phase]: [...prev[phase], evt] }));
  }

  function loadExample() {
    setQuery("la pub Apple où Steve Jobs lit le poème 'Here's to the crazy ones'");
  }

  async function hunt(startPhase = 1) {
    // Validate only when starting fresh from phase 1
    if (startPhase === 1) {
      if (!query.trim()) {
        setError({ message: 'Une requête est requise.' });
        return;
      }
      setDossier(null);
      builtRef.current = {
        schemaVersion: 'research-dossier-v1',
        id: `dossier-${Date.now().toString(36)}`,
        generatedAt: new Date().toISOString(),
        sighting: { query: query.trim(), resolvedAssetUrl: null, queryInterpretation: null },
        brandUid: null,
        campaignUid: null,
        sidecarFindings: [],
      };
      setDossier({ ...builtRef.current });
    } else {
      // Retry-from-phase: recover state if needed
      if (!builtRef.current && dossier) {
        // Deep-clone from React state as fallback
        builtRef.current = JSON.parse(JSON.stringify(dossier));
      }
      if (!builtRef.current) {
        setError({ message: 'Aucun état précédent à reprendre. Relance un hunt complet.' });
        return;
      }
    }

    setRunning(true);
    setError(null);
    setDebugOpen(false);

    // Reset phases ≥ startPhase to pending/active, keep prior ones complete
    setPhases((p) => {
      const np = { ...p };
      for (let i = startPhase; i <= 4; i++) np[i] = i === startPhase ? 'active' : 'pending';
      return np;
    });
    setLogs((l) => {
      const nl = { ...l };
      for (let i = startPhase; i <= 4; i++) nl[i] = [];
      return nl;
    });
    setExpanded((e) => {
      const ne = { ...e };
      for (let i = startPhase; i <= 4; i++) ne[i] = i === startPhase;
      return ne;
    });

    const built = builtRef.current;
    // Filter sidecar findings: keep only those produced by phases strictly BEFORE startPhase.
    // Phases ≥ startPhase will re-run and re-emit their findings.
    if (Array.isArray(built.sidecarFindings)) {
      built.sidecarFindings = built.sidecarFindings.filter((s) => {
        const phase = s.__sourcePhase;
        return typeof phase === 'number' && phase < startPhase;
      });
    }

    let currentPhase = startPhase;
    try {
      // ─── Phase 1 ─── Parse + Identify
      if (currentPhase <= 1) {
        const phase1Msg = `User query (natural language, may be in French, English, or mixed):\n\n"""\n${query.trim()}\n"""\n\nParse it, disambiguate if multiple candidates, identify the campaign. Use canonical short brand name (critical for UID system).`;
        const phase1Out = await runPhase(PHASE_PROMPTS[1], phase1Msg, (e) => addLog(1, e), 1);
        const campaign = phase1Out.campaign || phase1Out;
        built.sighting.resolvedAssetUrl = phase1Out.resolvedAssetUrl || null;
        built.sighting.queryInterpretation = phase1Out.queryInterpretation || null;
        built.campaign = campaign;
        built.brandUid = brandUid(campaign.brand);
        built.campaignUid = campaignUid(campaign.brand, campaign.slug, campaign.year);
        const p1Side = (phase1Out.sidecarFindings || []).map(enrichSidecar).filter((s) => s.targetUid).map((s) => ({ ...s, __sourcePhase: 1 }));
        built.sidecarFindings = [...(built.sidecarFindings || []), ...p1Side];
        builtRef.current = built;
        setDossier({ ...built });
        setPhases((p) => ({ ...p, 1: 'complete', 2: 'active' }));
        setExpanded((e) => ({ ...e, 1: false, 2: true }));
        currentPhase = 2;
      }

      // ─── Phase 2 ─── Assets + DNA
      if (currentPhase <= 2) {
        const phase2Msg = `Campaign:\n${JSON.stringify(built.campaign, null, 2)}\n\nbrandUid: ${built.brandUid}\ncampaignUid: ${built.campaignUid}\n\n${built.sighting.resolvedAssetUrl ? `Canonical asset URL: ${built.sighting.resolvedAssetUrl}\n\n` : ''}Find and DNA-tag the canonical assets.`;
        const assetsBlock = await runPhase(PHASE_PROMPTS[2], phase2Msg, (e) => addLog(2, e), 2);
        built.assets = (assetsBlock.assets || []).map((a) => ({
          ...a,
          uid: assetUid(built.campaign.brand, built.campaign.slug, built.campaign.year, a.id, a.kind),
        }));
        const p2Side = (assetsBlock.sidecarFindings || []).map(enrichSidecar).filter((s) => s.targetUid).map((s) => ({ ...s, __sourcePhase: 2 }));
        built.sidecarFindings = [...(built.sidecarFindings || []), ...p2Side];
        builtRef.current = built;
        setDossier({ ...built });
        setPhases((p) => ({ ...p, 2: 'complete', 3: 'active' }));
        setExpanded((e) => ({ ...e, 2: false, 3: true }));
        currentPhase = 3;
      }

      // ─── Phase 3 ─── Axes / Performance / Victories
      if (currentPhase <= 3) {
        const phase3Msg = `Campaign:\n${JSON.stringify(built.campaign, null, 2)}\n\nAssets (${built.assets.length}):\n${JSON.stringify(built.assets.map((a) => ({ uid: a.uid, kind: a.kind, function: a.function })), null, 2)}`;
        const ctx = await runPhase(PHASE_PROMPTS[3], phase3Msg, (e) => addLog(3, e), 3);
        built.axes = ctx.axes || [];
        built.performance = ctx.performance || [];
        built.victories = ctx.victories || [];
        const p3Side = (ctx.sidecarFindings || []).map(enrichSidecar).filter((s) => s.targetUid).map((s) => ({ ...s, __sourcePhase: 3 }));
        built.sidecarFindings = [...(built.sidecarFindings || []), ...p3Side];
        builtRef.current = built;
        setDossier({ ...built });
        setPhases((p) => ({ ...p, 3: 'complete', 4: 'active' }));
        setExpanded((e) => ({ ...e, 3: false, 4: true }));
        currentPhase = 4;
      }

      // ─── Phase 4 ─── Editorial + Safety
      if (currentPhase <= 4) {
        const draftForP4 = {
          campaign: built.campaign,
          brandUid: built.brandUid,
          campaignUid: built.campaignUid,
          assets: built.assets,
          axes: built.axes,
          performance: built.performance,
          victories: built.victories,
        };
        const phase4Msg = `Original user query: "${query.trim()}"\nQuery interpretation: ${built.sighting.queryInterpretation || '(none)'}\n\nFull dossier draft:\n${JSON.stringify(draftForP4, null, 2)}`;
        const finalBlock = await runPhase(PHASE_PROMPTS[4], phase4Msg, (e) => addLog(4, e), 4);
        built.editorial = finalBlock.editorial;
        built.safety = finalBlock.safety;
        built.completedAt = new Date().toISOString();
        builtRef.current = built;
        setDossier({ ...built });
        setPhases((p) => ({ ...p, 4: 'complete' }));
      }

      // Persist if safety verdict is not REJECT
      if (built.safety?.verdict !== 'REJECT') {
        await persistDossier(built);
      }
    } catch (e) {
      addLog(currentPhase, { type: 'error', message: e.message });
      setPhases((p) => ({ ...p, [currentPhase]: 'error' }));
      setError({
        message: e.message,
        phase: currentPhase,
        rawOutput: e.rawOutput || null,
        rawJsonAttempt: e.rawJsonAttempt || null,
      });
    } finally {
      setRunning(false);
    }
  }

  function copyJson() {
    if (!dossier) return;
    const text = JSON.stringify(cleanForExport(dossier), null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadJson() {
    if (!dossier) return;
    const text = JSON.stringify(cleanForExport(dossier), null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = dossier.campaign?.slug || `argos-${Date.now()}`;
    a.href = url;
    a.download = `${slug}.dossier.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (dossier && dossierRef.current) {
      dossierRef.current.scrollTop = dossierRef.current.scrollHeight;
    }
  }, [dossier]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200" style={{ fontFamily: "'Newsreader', 'Spectral', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .serif { font-family: 'Newsreader', 'Spectral', Georgia, serif; }
        .grain::before {
          content: '';
          position: fixed; inset: 0;
          pointer-events: none;
          opacity: 0.025;
          z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .glow-amber { box-shadow: 0 0 24px -8px rgb(245 158 11 / 0.4); }
      `}</style>

      <div className="grain" />

      <div className="relative max-w-7xl mx-auto px-6 py-10">
        {/* HEADER */}
        <header className="mb-12 pb-8 border-b border-stone-800/80">
          <div className="flex items-baseline justify-between mb-2">
            <span className="mono text-xs text-stone-500 tracking-widest">ARGOS · v0.1</span>
            <span className="mono text-xs text-stone-600 tabular-nums">
              {new Date().toISOString().slice(0, 16).replace('T', ' ')}Z
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl tracking-tight text-stone-100 mb-3" style={{ fontWeight: 500, letterSpacing: '-0.03em' }}>
            Argos<span className="text-amber-500">.</span>
          </h1>
          <p className="text-stone-400 text-lg italic max-w-2xl leading-snug">
            Campaign intelligence harvester. Convertit une <em>sighting</em> en dossier de recherche structuré — schema <span className="mono text-amber-500/90 not-italic">research-dossier-v1</span>.
          </p>
        </header>

        {/* REGISTRY STRIP */}
        <RegistryStrip
          registry={registry}
          open={registryOpen}
          onToggle={() => setRegistryOpen((v) => !v)}
          tab={registryTab}
          onTabChange={setRegistryTab}
          onDeleteDossier={deleteDossier}
          onRefresh={refreshRegistry}
          onClear={clearDossiers}
        />

        {/* INPUT */}
        <section className="mb-10">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="mono text-xs text-stone-500 tracking-widest">// QUERY</span>
            <button
              onClick={loadExample}
              disabled={running}
              className="mono text-xs text-stone-500 hover:text-amber-500 transition-colors disabled:opacity-30"
            >
              [load example]
            </button>
            <span className="mono text-xs text-stone-700 ml-auto italic">langage naturel · FR/EN · vague accepté</span>
          </div>

          <div className="space-y-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={running}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !running && query.trim()) {
                  hunt();
                }
              }}
              placeholder="Ex: la pub Apple où Steve Jobs lit le poème · la dernière campagne Nike pour les JO · ce billboard Coca-Cola avec les prénoms · Bonnet Rouge Côte d'Ivoire 2024…"
              rows={3}
              className="w-full bg-stone-900/60 border border-stone-800 rounded px-4 py-3 serif text-base text-stone-100 leading-relaxed focus:outline-none focus:border-amber-500/60 focus:bg-stone-900 disabled:opacity-50 resize-none"
            />

            <div className="flex items-center justify-between">
              <span className="mono text-xs text-stone-600">
                {query.length > 0 ? `${query.length} chars` : '⌘+↵ pour lancer'}
              </span>
              <button
                onClick={() => hunt()}
                disabled={running || !query.trim()}
                className={`px-8 py-3 mono text-sm tracking-wide rounded transition-all ${
                  running || !query.trim()
                    ? 'bg-stone-800 text-stone-600 cursor-not-allowed'
                    : 'bg-amber-500 text-stone-950 hover:bg-amber-400 glow-amber font-semibold'
                }`}
              >
                {running ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    HUNTING…
                  </span>
                ) : (
                  'INITIATE HUNT →'
                )}
              </button>
            </div>

            {dossier?.sighting?.queryInterpretation && !running && (
              <div className="mt-3 px-4 py-3 bg-stone-900/40 border-l-2 border-amber-500/60 rounded-r">
                <div className="mono text-[10px] text-stone-500 tracking-widest mb-1">// QUERY → INTERPRETATION</div>
                <div className="serif text-sm text-stone-300 italic">{dossier.sighting.queryInterpretation}</div>
                {dossier.campaign?.notes && (
                  <div className="mt-2 mono text-xs text-stone-500">
                    <span className="text-amber-500/80">notes:</span> {dossier.campaign.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* PHASE TRACKER */}
          <section className="lg:col-span-2">
            <div className="mono text-xs text-stone-500 tracking-widest mb-4">// AGENTIC PIPELINE</div>
            <div className="bg-stone-900/40 border border-stone-800 rounded">
              {[1, 2, 3, 4].map((n) => (
                <PhaseRow
                  key={n}
                  num={n}
                  status={phases[n]}
                  log={logs[n]}
                  expanded={expanded[n]}
                  onToggle={() => setExpanded((e) => ({ ...e, [n]: !e[n] }))}
                />
              ))}
            </div>

            {error && (
              <div className="mt-4 border border-red-900/60 bg-red-950/20 rounded overflow-hidden">
                <div className="px-4 py-3">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="mono text-xs text-red-400 mb-1">
                        ERROR{error.phase ? ` · phase ${error.phase}` : ''}
                      </div>
                      <div className="text-sm text-stone-300">{error.message}</div>
                    </div>
                  </div>
                  {error.phase && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => hunt(error.phase)}
                        disabled={running}
                        className="mono text-xs px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-900/40 flex items-center gap-1.5 disabled:opacity-30"
                      >
                        <RefreshCw className="w-3 h-3" /> retry phase {error.phase}
                      </button>
                      <button
                        onClick={() => hunt(1)}
                        disabled={running}
                        className="mono text-xs px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded border border-stone-800 flex items-center gap-1.5 disabled:opacity-30"
                      >
                        <RefreshCw className="w-3 h-3" /> restart full hunt
                      </button>
                      {(error.rawOutput || error.rawJsonAttempt) && (
                        <button
                          onClick={() => setDebugOpen((v) => !v)}
                          className="mono text-xs px-3 py-1.5 text-stone-500 hover:text-stone-300 flex items-center gap-1.5 ml-auto"
                        >
                          {debugOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          raw output
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {debugOpen && (error.rawOutput || error.rawJsonAttempt) && (
                  <div className="border-t border-red-900/40 bg-stone-950/60 max-h-64 overflow-auto">
                    {error.rawJsonAttempt && (
                      <div className="p-3">
                        <div className="mono text-[10px] text-stone-500 tracking-widest mb-1">// EXTRACTED JSON ATTEMPT</div>
                        <pre className="mono text-[10px] text-stone-400 whitespace-pre-wrap break-all">{error.rawJsonAttempt}</pre>
                      </div>
                    )}
                    {error.rawOutput && error.rawOutput !== error.rawJsonAttempt && (
                      <div className="p-3 border-t border-stone-800/60">
                        <div className="mono text-[10px] text-stone-500 tracking-widest mb-1">// FULL LLM TEXT</div>
                        <pre className="mono text-[10px] text-stone-500 whitespace-pre-wrap break-all">{error.rawOutput}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {dossier?.safety && (
              <div className={`mt-4 border rounded px-4 py-3 ${
                dossier.safety.verdict === 'PASS' ? 'border-emerald-900/60 bg-emerald-950/20' :
                dossier.safety.verdict === 'QUARANTINE' ? 'border-amber-900/60 bg-amber-950/20' :
                'border-red-900/60 bg-red-950/20'
              }`}>
                <div className="mono text-xs tracking-widest mb-1 text-stone-400">// SAFETY VERDICT</div>
                <div className={`mono text-lg font-semibold ${
                  dossier.safety.verdict === 'PASS' ? 'text-emerald-400' :
                  dossier.safety.verdict === 'QUARANTINE' ? 'text-amber-400' :
                  'text-red-400'
                }`}>{dossier.safety.verdict}</div>
                {dossier.safety.reasons?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {dossier.safety.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-stone-400 flex gap-2">
                        <span className="text-stone-600">·</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* JSON OUTPUT */}
          <section className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="mono text-xs text-stone-500 tracking-widest">// research-dossier-v1.json</div>
              {dossier && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyJson}
                    className="mono text-xs px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded border border-stone-800 transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? 'copied' : 'copy'}
                  </button>
                  <button
                    onClick={downloadJson}
                    className="mono text-xs px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-900/40 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    .json
                  </button>
                </div>
              )}
            </div>

            <div
              ref={dossierRef}
              className="bg-stone-900/40 border border-stone-800 rounded overflow-auto"
              style={{ maxHeight: '70vh' }}
            >
              {dossier ? (
                <pre className="mono text-xs text-stone-300 p-4 leading-relaxed">
                  <JsonView data={cleanForExport(dossier)} />
                </pre>
              ) : (
                <div className="p-12 text-center">
                  <FileJson className="w-8 h-8 text-stone-700 mx-auto mb-3" />
                  <div className="mono text-xs text-stone-600">Aucun dossier généré.</div>
                  <div className="text-sm text-stone-500 italic mt-1">Soumets une sighting pour démarrer.</div>
                </div>
              )}
            </div>

            {dossier && (
              <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                <Stat label="campaign" value={dossier.campaign?.confidence || '—'} />
                <Stat label="assets" value={dossier.assets?.length ?? 0} />
                <Stat label="axes" value={dossier.axes?.length ?? 0} />
                <Stat label="wins" value={dossier.victories?.length ?? 0} />
                <Stat label="sidecar" value={dossier.sidecarFindings?.length ?? 0} highlight={(dossier.sidecarFindings?.length ?? 0) > 0} />
              </div>
            )}
          </section>
        </div>

        {/* FOOTER */}
        <footer className="mt-16 pt-6 border-t border-stone-800/60 flex items-center justify-between mono text-xs text-stone-600">
          <span>argos · campaign intelligence harvester</span>
          <span>schema: research-dossier-v1 · 4-phase agentic pipeline</span>
        </footer>
      </div>
    </div>
  );
}

function RegistryStrip({ registry, open, onToggle, tab, onTabChange, onDeleteDossier, onRefresh, onClear }) {
  const counts = {
    brands: registry.brands.length,
    campaigns: registry.campaigns.length,
    assets: registry.assets.length,
    mentions: registry.mentions.reduce((acc, m) => acc + m.count, 0),
  };
  const total = counts.brands + counts.campaigns + counts.assets;
  const orphanMentions = registry.mentions.filter((m) => !m.hasprimaryCoverage).length;

  return (
    <section className="mb-10 border border-stone-800 bg-stone-900/30 rounded">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-stone-900/60 transition-colors text-left"
      >
        <Database className="w-4 h-4 text-amber-500/80" />
        <span className="mono text-xs text-stone-500 tracking-widest">// REGISTRY</span>
        <span className="mono text-[10px] text-stone-600">{registry.dossierCount} dossier{registry.dossierCount !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-4 mono text-xs ml-2">
          <RegistryCounter label="brands" value={counts.brands} />
          <span className="text-stone-700">·</span>
          <RegistryCounter label="campaigns" value={counts.campaigns} />
          <span className="text-stone-700">·</span>
          <RegistryCounter label="assets" value={counts.assets} />
          <span className="text-stone-700">·</span>
          <RegistryCounter label="mentions" value={counts.mentions} highlight={orphanMentions > 0} />
        </div>
        {registry.unavailable && (
          <span className="mono text-[10px] text-red-400 ml-2">storage unavailable</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {total === 0 && !registry.unavailable && (
            <span className="mono text-xs text-stone-600 italic">empty · first hunt populates</span>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-stone-500" /> : <ChevronRight className="w-4 h-4 text-stone-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-800">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-stone-800/60">
            {['brands', 'campaigns', 'assets', 'mentions'].map((t) => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={`mono text-xs px-3 py-1 rounded transition-colors ${
                  tab === t
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-900/40'
                    : 'text-stone-500 hover:text-stone-300 border border-transparent'
                }`}
              >
                {t} {t === 'mentions' && orphanMentions > 0 && <span className="text-amber-400">({orphanMentions} orphan)</span>}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={onRefresh}
                className="mono text-xs px-2 py-1 text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> refresh
              </button>
              <button
                onClick={onClear}
                className="mono text-xs px-2 py-1 text-stone-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> wipe
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="px-4 py-3 max-h-72 overflow-y-auto">
            {tab === 'brands' && <RegistryListBrands brands={registry.brands} campaigns={registry.campaigns} />}
            {tab === 'campaigns' && <RegistryListCampaigns campaigns={registry.campaigns} onDeleteDossier={onDeleteDossier} />}
            {tab === 'assets' && <RegistryListAssets assets={registry.assets} />}
            {tab === 'mentions' && <RegistryListMentions mentions={registry.mentions} />}
          </div>
        </div>
      )}
    </section>
  );
}

function RegistryCounter({ label, value, highlight }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className={`tabular-nums font-semibold ${highlight ? 'text-amber-400' : 'text-stone-200'}`}>{value}</span>
      <span className="text-stone-500">{label}</span>
    </span>
  );
}

function RegistryListBrands({ brands, campaigns }) {
  if (brands.length === 0) return <EmptyHint text="Aucune marque encore. Le premier hunt l'enregistre." />;
  return (
    <div className="space-y-2">
      {brands.map((b) => {
        const brandCampaigns = campaigns.filter((c) => c.brandUid === b.uid);
        return (
          <div key={b.uid} className="border border-stone-800 rounded p-3 bg-stone-950/40">
            <div className="flex items-baseline justify-between mb-1">
              <span className="serif text-base text-stone-100">{b.displayName}</span>
              <span className="mono text-[10px] text-stone-600">{b.uid}</span>
            </div>
            <div className="mono text-xs text-stone-500">
              {brandCampaigns.length} campaign{brandCampaigns.length !== 1 ? 's' : ''}
              {brandCampaigns.length > 0 && (
                <span className="text-stone-600"> · {brandCampaigns.map((c) => c.campaign?.title || c.campaign?.slug).filter(Boolean).join(' · ')}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RegistryListCampaigns({ campaigns, onDeleteDossier }) {
  if (campaigns.length === 0) return <EmptyHint text="Aucune campagne encore." />;
  return (
    <div className="space-y-2">
      {campaigns.map((c) => (
        <div key={c.uid} className="border border-stone-800 rounded p-3 bg-stone-950/40">
          <div className="flex items-baseline justify-between mb-1 gap-2">
            <span className="serif text-base text-stone-100 truncate">
              {c.campaign?.brand} <span className="text-stone-500">·</span> {c.campaign?.title || c.campaign?.slug}
              <span className="text-stone-500 ml-2 mono text-sm">{c.campaign?.year}</span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`mono text-[10px] px-1.5 py-0.5 rounded ${
                c.safety?.verdict === 'PASS' ? 'bg-emerald-950/40 text-emerald-400' :
                c.safety?.verdict === 'QUARANTINE' ? 'bg-amber-950/40 text-amber-400' :
                'bg-stone-800 text-stone-500'
              }`}>
                {c.safety?.verdict || '?'}
              </span>
              <button
                onClick={() => onDeleteDossier(c.latestDossierId)}
                title="Delete latest dossier for this campaign"
                className="mono text-[10px] text-stone-600 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="mono text-[10px] text-stone-600 mb-1 truncate">{c.uid}</div>
          <div className="mono text-xs text-stone-500">
            {c.assetUids?.length || 0} assets · {c.axes?.length || 0} axes · {c.victories?.length || 0} wins
            {c.dossierIds?.length > 1 && (
              <span className="text-amber-500/70"> · {c.dossierIds.length} dossiers (re-hunted)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function RegistryListAssets({ assets }) {
  if (assets.length === 0) return <EmptyHint text="Aucun asset encore." />;
  return (
    <div className="space-y-2">
      {assets.map((a) => (
        <div key={a.uid} className="border border-stone-800 rounded p-3 bg-stone-950/40">
          <div className="flex items-baseline justify-between mb-1">
            <span className="serif text-sm text-stone-100">
              <span className="mono text-xs text-amber-500/80 mr-2">[{a.data?.kind}]</span>
              {a.data?.function} — <span className="italic text-stone-300">{a.data?.id}</span>
            </span>
          </div>
          <div className="mono text-[10px] text-stone-600 truncate">{a.uid}</div>
        </div>
      ))}
    </div>
  );
}

function RegistryListMentions({ mentions }) {
  if (mentions.length === 0) return <EmptyHint text="Aucune mention latérale. Argos en émet quand il croise des infos hors-cible pendant un hunt." />;

  const orphans = mentions.filter((m) => !m.hasprimaryCoverage);
  const covered = mentions.filter((m) => m.hasprimaryCoverage);

  return (
    <div className="space-y-4">
      {orphans.length > 0 && (
        <div>
          <div className="mono text-[10px] text-amber-500/80 tracking-widest mb-2">// ORPHANS ({orphans.length}) — entités jamais chassées en cible</div>
          <div className="space-y-2">
            {orphans.map((m) => <MentionGroup key={m.targetUid} group={m} />)}
          </div>
        </div>
      )}
      {covered.length > 0 && (
        <div>
          <div className="mono text-[10px] text-stone-500 tracking-widest mb-2">// COVERED ({covered.length}) — entités déjà dans le registry</div>
          <div className="space-y-2">
            {covered.map((m) => <MentionGroup key={m.targetUid} group={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MentionGroup({ group }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-stone-800 rounded bg-stone-950/40 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-baseline justify-between gap-3 p-3 hover:bg-stone-900/60 transition-colors text-left">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="mono text-[10px] uppercase tracking-widest text-amber-500/80">{group.targetType}</span>
          <span className="mono text-xs text-stone-300 truncate">{group.targetUid}</span>
        </div>
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="mono text-xs text-stone-500">{group.count} mention{group.count !== 1 ? 's' : ''}</span>
          {open ? <ChevronDown className="w-3 h-3 text-stone-500" /> : <ChevronRight className="w-3 h-3 text-stone-500" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-stone-800/60 p-3 space-y-2">
          {group.items.map((item, i) => (
            <div key={i} className="text-sm">
              <div className="mono text-[10px] text-stone-500 mb-1">
                from <span className="text-stone-400">{item.sourceBrand} · {item.sourceCampaignTitle}</span> <span className="text-stone-700">·</span> phase {item.finding?.type}
              </div>
              <div className="serif text-sm text-stone-300 italic">"{item.finding?.content}"</div>
              {item.finding?.excerpt && (
                <div className="mono text-xs text-stone-500 pl-3 border-l border-stone-800 mt-1 truncate">{item.finding.excerpt}</div>
              )}
              {item.finding?.sourceUrl && (
                <a href={item.finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="mono text-[10px] text-stone-600 hover:text-amber-400 truncate block mt-1">
                  ↗ {item.finding.sourceUrl}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyHint({ text }) {
  return <div className="mono text-xs text-stone-600 italic text-center py-4">{text}</div>;
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`border rounded px-2 py-2 ${highlight ? 'bg-amber-950/20 border-amber-900/40' : 'bg-stone-900/40 border-stone-800'}`}>
      <div className="mono text-[10px] text-stone-600 tracking-widest uppercase">{label}</div>
      <div className={`mono text-sm ${highlight ? 'text-amber-400' : 'text-stone-200'}`}>{value}</div>
    </div>
  );
}

// Tiny JSON syntax-coloring (no external dep)
function JsonView({ data }) {
  const text = JSON.stringify(data, null, 2);
  // Light tokenization — keys, strings, numbers, booleans
  const parts = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      // String: detect if it's a key (followed by colon) or value
      let j = i + 1;
      while (j < text.length && (text[j] !== '"' || text[j - 1] === '\\')) j++;
      const str = text.slice(i, j + 1);
      const isKey = text[j + 1] === ':';
      parts.push(<span key={i} className={isKey ? 'text-amber-400/90' : 'text-emerald-300/80'}>{str}</span>);
      i = j + 1;
    } else if (/[0-9-]/.test(c) && (parts.length === 0 || /[\s,:\[\n]$/.test(text[i - 1] || ''))) {
      let j = i;
      while (j < text.length && /[0-9.\-eE+]/.test(text[j])) j++;
      parts.push(<span key={i} className="text-cyan-300/80">{text.slice(i, j)}</span>);
      i = j;
    } else if (text.slice(i, i + 4) === 'true' || text.slice(i, i + 5) === 'false') {
      const len = text.slice(i, i + 5) === 'false' ? 5 : 4;
      parts.push(<span key={i} className="text-purple-300/80">{text.slice(i, i + len)}</span>);
      i += len;
    } else if (text.slice(i, i + 4) === 'null') {
      parts.push(<span key={i} className="text-stone-500 italic">null</span>);
      i += 4;
    } else {
      parts.push(<span key={i}>{c}</span>);
      i++;
    }
  }
  return <>{parts}</>;
}
