/**
 * Phase 18-A1-δ — Splitter heuristique d'un blob d'inputs externes
 * (mail/slack/whatsapp coller-multi) en N sources discrètes.
 *
 * Règles déterministes (sans LLM) :
 *  - Détection mail RFC822 : block commençant par `From:` / `De :` / `Sujet :` / `Subject:`
 *    ou délimité par `--- ... ---` ou `========`
 *  - Détection thread Slack : block contenant `[N réponses]` ou `Slack` mention
 *  - Sinon : split par double newline (paragraphes vides)
 *
 * Note : LLM splitter (Claude) peut être branché en Phase 2 fine-tune via
 * `previewBatch({ useLlmSplitter: true })`. Pour MVP, le splitter règles
 * suffit en quotidien Matanga où le opérateur paste des blocks identifiables.
 */

import type { IngestedSourceKind } from "@prisma/client";

export interface RawSource {
  kind: IngestedSourceKind;
  externalId?: string | null;
  sourceUrl?: string | null;
  sender?: string | null;
  subject?: string | null;
  rawText: string;
  threadKey?: string | null;
  language?: string | null;
}

const MAIL_HEADER_RE = /^(From|De|Expéditeur|Sujet|Subject)\s*:/im;
const SLACK_THREAD_RE = /(\[(\d+)\s+réponses?\]|Slack\s+#[\w-]+)/i;
const WHATSAPP_RE = /(WhatsApp|wa\.me|wa-id)/i;
const DATE_LINE_RE = /^(?:Le\s+|Sent:|On\s+|Date\s*:)\s*\d/im;

/** Détecte la "kind" d'un block selon des heuristiques bon marché. */
function detectKind(text: string): IngestedSourceKind {
  if (MAIL_HEADER_RE.test(text)) return "EMAIL";
  if (SLACK_THREAD_RE.test(text)) return "SLACK";
  if (WHATSAPP_RE.test(text)) return "WHATSAPP";
  return "MANUAL_PASTE";
}

/** Extrait From: / Sujet: si présent, sinon retourne null. */
function extractMailMeta(text: string): { sender: string | null; subject: string | null } {
  const fromMatch = text.match(/^(?:From|De|Expéditeur)\s*:\s*([^\n\r]+)/im);
  const subjectMatch = text.match(/^(?:Sujet|Subject)\s*:\s*([^\n\r]+)/im);
  return {
    sender: fromMatch?.[1]?.trim() ?? null,
    subject: subjectMatch?.[1]?.trim() ?? null,
  };
}

/** Détecte la langue du block (FR / EN / FR_EN) heuristique. */
function detectLanguage(text: string): "FR" | "EN" | "FR_EN" | null {
  const lower = text.toLowerCase();
  const frHits = (lower.match(/\b(le|la|les|de|du|et|est|nous|avec|pour|dans|sur)\b/g) ?? []).length;
  const enHits = (lower.match(/\b(the|and|is|with|for|on|in|that|this|we|are)\b/g) ?? []).length;
  if (frHits > 5 && enHits > 5 && Math.abs(frHits - enHits) < 8) return "FR_EN";
  if (frHits > enHits) return "FR";
  if (enHits > frHits) return "EN";
  return null;
}

/**
 * Split principal du blob. Retourne 0..N RawSource.
 *
 * Ordre de résolution :
 *  1. Tente split par marqueurs explicites `---` / `===` / `***`
 *  2. Tente split par mail-header repetitive (multi-mail forwarded chain)
 *  3. Tente split par double-newline si block > 500 chars
 *  4. Sinon : 1 seul block
 */
export function splitInboundBatch(blob: string): RawSource[] {
  const trimmed = blob.trim();
  if (!trimmed) return [];

  // 1. Marqueurs explicites
  const explicitDelim = trimmed.split(/\n[-=*]{3,}\n/);
  if (explicitDelim.length > 1) {
    return explicitDelim
      .map((b) => b.trim())
      .filter((b) => b.length > 20)
      .map(buildSource);
  }

  // 2. Multi-mail (multiple From: lignes)
  const fromMatches = [...trimmed.matchAll(/^(?:From|De|Expéditeur)\s*:/gim)];
  if (fromMatches.length > 1) {
    const blocks: string[] = [];
    let lastIdx = 0;
    for (let i = 1; i < fromMatches.length; i++) {
      const idx = fromMatches[i]!.index!;
      blocks.push(trimmed.slice(lastIdx, idx).trim());
      lastIdx = idx;
    }
    blocks.push(trimmed.slice(lastIdx).trim());
    return blocks.filter((b) => b.length > 20).map(buildSource);
  }

  // 3. Double-newline si blob long
  if (trimmed.length > 500) {
    const paras = trimmed.split(/\n\s*\n/);
    if (paras.length > 1 && paras.every((p) => p.trim().length > 30)) {
      return paras.map((p) => p.trim()).map(buildSource);
    }
  }

  // 4. Block unique
  return [buildSource(trimmed)];
}

function buildSource(rawText: string): RawSource {
  const kind = detectKind(rawText);
  const meta = kind === "EMAIL" ? extractMailMeta(rawText) : { sender: null, subject: null };
  const lang = detectLanguage(rawText);
  return {
    kind,
    sender: meta.sender,
    subject: meta.subject,
    rawText,
    language: lang,
  };
}
