/**
 * audit-llm-chunking-candidates.ts
 *
 * Sprint 1.3 — scan le repo pour identifier les sites LLM single-call
 * qui pourraient bénéficier du pattern `runChunkedFieldGeneration`
 * (cf. RESIDUAL-DEBT v6.1.36 lessons learned).
 *
 * Heuristique : flag les `callLLMAndParse` ou `generateText` calls qui :
 * - ont `maxOutputTokens >= 4000` (signal d'output volumineux)
 * - prompt suggère >10 nested fields (compte les bullet points / patterns "field: ...")
 *
 * Sortie : liste prioritisée des candidats à auditer dans Sprint 4
 * (LLM chunking audit complet 35 sections).
 *
 * Usage : `npx tsx scripts/audit-llm-chunking-candidates.ts`
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

interface Candidate {
  file: string;
  line: number;
  caller: string;
  maxOutputTokens?: number;
  estimatedFields?: number;
  reason: string;
}

const candidates: Candidate[] = [];

function* walkFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const s = statSync(full);
    if (s.isDirectory()) {
      yield* walkFiles(full);
    } else if (s.isFile() && (full.endsWith(".ts") || full.endsWith(".tsx"))) {
      yield full;
    }
  }
}

function extractCallerName(text: string, callIndex: number): string {
  const before = text.slice(Math.max(0, callIndex - 200), callIndex);
  const callerMatch = before.match(/caller:\s*"([^"]+)"/);
  if (callerMatch) return callerMatch[1]!;
  return "(unknown caller)";
}

function detectChunkingNearby(text: string, callIndex: number): boolean {
  const surrounding = text.slice(callIndex, Math.min(text.length, callIndex + 1500));
  return /runChunkedFieldGeneration|chunk(?:ed|s)|chunkSize/i.test(surrounding);
}

for (const file of walkFiles(SRC)) {
  const text = readFileSync(file, "utf-8");
  const rel = relative(ROOT, file);

  const llmCallRegex = /(callLLMAndParse|generateText)\s*\(/g;
  let match;
  while ((match = llmCallRegex.exec(text)) !== null) {
    const callIndex = match.index;
    const lineNum = text.slice(0, callIndex).split("\n").length;
    const caller = extractCallerName(text, callIndex);

    const callBlock = text.slice(callIndex, Math.min(text.length, callIndex + 2000));
    const tokensMatch = callBlock.match(/maxOutputTokens:\s*(\d+)/);
    const maxTokens = tokensMatch ? parseInt(tokensMatch[1]!, 10) : undefined;

    const fieldMatches = callBlock.match(/^\s*[-*]\s|"\w+":\s/gm) ?? [];
    const estimatedFields = fieldMatches.length;

    const hasChunking = detectChunkingNearby(text, callIndex);

    if (maxTokens && maxTokens >= 4000 && !hasChunking) {
      candidates.push({
        file: rel,
        line: lineNum,
        caller,
        maxOutputTokens: maxTokens,
        estimatedFields,
        reason: `maxOutputTokens=${maxTokens} sans chunking détecté à proximité`,
      });
    } else if (estimatedFields >= 15 && !hasChunking) {
      candidates.push({
        file: rel,
        line: lineNum,
        caller,
        estimatedFields,
        reason: `prompt mentionne ${estimatedFields}+ field-like patterns sans chunking`,
      });
    }
  }
}

candidates.sort((a, b) => (b.maxOutputTokens ?? 0) - (a.maxOutputTokens ?? 0));

console.log(`# LLM Chunking Audit — ${candidates.length} candidats détectés\n`);
console.log(`Heuristique : maxOutputTokens >= 4000 OU >= 15 field patterns, sans \`runChunkedFieldGeneration\` à proximité.\n`);
console.log(`Sites prioritaires (Sprint 4 audit complet) :\n`);

if (candidates.length === 0) {
  console.log("✅ Aucun candidat détecté. Pattern chunking adopté ou prompts compacts.");
} else {
  for (const c of candidates.slice(0, 20)) {
    console.log(`- **${c.file}:${c.line}** (caller: \`${c.caller}\`)`);
    if (c.maxOutputTokens) console.log(`  - maxOutputTokens: ${c.maxOutputTokens}`);
    if (c.estimatedFields) console.log(`  - field patterns: ~${c.estimatedFields}`);
    console.log(`  - reason: ${c.reason}`);
  }
  if (candidates.length > 20) {
    console.log(`\n... et ${candidates.length - 20} autres candidats. Run sans truncation.`);
  }
}
console.log(`\n---\nTotal candidats : ${candidates.length}`);
