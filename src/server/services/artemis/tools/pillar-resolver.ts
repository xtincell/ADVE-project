/**
 * Pillar Resolver — Resolves atomic pillar variable paths to values
 *
 * This is the IRRIGATION SYSTEM of ADVE-RTIS. Every tool, sequence, and
 * livrable in the system ultimately reads atomic variables from the 8 pillars.
 * This resolver navigates pillar content using dot-notation paths and returns
 * the resolved values.
 *
 * Architecture:
 *   HYPERVISEUR  → decides which sequences to run
 *   SUPERVISEUR  → maintains coherence within a sequence
 *   ORCHESTRATEUR → executes steps, calls this resolver
 *   OUTIL        → receives resolved atomic values + general context
 *
 * Three context layers for every tool execution:
 *   1. SYSTEM (constant)  — full strategy context (loadStrategyContext)
 *   2. SEQUENCE (accumulated) — outputs from previous steps
 *   3. ATOMIC (resolved)  — specific values from pillarBindings via this resolver
 *
 * Usage:
 *   const resolver = await PillarResolver.forStrategy(strategyId);
 *   const brandDna = resolver.resolve("a.noyauIdentitaire"); // → string value
 *   const personas = resolver.resolve("d.personas"); // → Persona[] array
 *   const resolved = resolver.resolveBindings({ brand_dna: "a.noyauIdentitaire", tone: "d.tonDeVoix.personnalite" });
 *   // → { brand_dna: "...", tone: ["Audacieux", "Direct", ...] }
 */

import { db } from "@/lib/db";
import type { PillarPath } from "./registry";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PillarData {
  key: string;
  content: Record<string, unknown>;
  confidence: number;
}

export interface ResolvedBindings {
  [inputField: string]: unknown;
}

// ─── Resolver ────────────────────────────────────────────────────────────────

export class PillarResolver {
  private pillars: Map<string, PillarData>;

  private constructor(pillars: PillarData[]) {
    this.pillars = new Map(pillars.map((p) => [p.key, p]));
  }

  /**
   * Create a resolver pre-loaded with all pillar data for a strategy.
   * Call once per sequence execution, reuse across all steps.
   */
  static async forStrategy(strategyId: string): Promise<PillarResolver> {
    const dbPillars = await db.pillar.findMany({
      where: { strategyId },
    });

    const pillars: PillarData[] = dbPillars.map((p) => ({
      key: p.key,
      content: (p.content as Record<string, unknown>) ?? {},
      confidence: p.confidence ?? 0,
    }));

    return new PillarResolver(pillars);
  }

  /**
   * Create a resolver from pre-loaded pillar data (no DB call).
   * Use when pillar data is already available in the sequence context.
   */
  static fromData(pillars: PillarData[]): PillarResolver {
    return new PillarResolver(pillars);
  }

  /**
   * Resolve a single pillar path to its value.
   * Path format: "pillarKey.field.subfield..." (dot notation)
   *
   * Examples:
   *   "a.archetype"              → "Rebel"
   *   "a.tonDeVoix.personnalite" → ["Audacieux", "Direct", "Inspirant"]
   *   "d.promesseMaitre"         → "Libérer le potentiel créatif de chaque marque"
   *   "r.globalSwot.strengths"   → ["Innovation constante", "Équipe senior"]
   *   "t.tamSamSom.tam.value"    → 5000000000
   *   "i.catalogueParCanal"      → { DIGITAL: [...], EVENEMENTIEL: [...] }
   *   "s.sprint90Days"           → [{ action: "...", priority: 1 }, ...]
   */
  resolve(path: PillarPath | string): unknown {
    const parts = path.split(".");
    if (parts.length < 2) return undefined;

    const pillarKey = parts[0]!;
    const pillar = this.pillars.get(pillarKey);
    if (!pillar) return undefined;

    let current: unknown = pillar.content;
    for (let i = 1; i < parts.length; i++) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[parts[i]!];
    }

    return current;
  }

  /**
   * Resolve all pillarBindings for a tool into input values.
   * Returns a Record<inputFieldName, resolvedValue>.
   *
   * Unresolvable bindings (missing pillar/field) return undefined.
   * Caller should fall back to sequence context or user input for these.
   */
  resolveBindings(bindings: Partial<Record<string, PillarPath | string>>): ResolvedBindings {
    const result: ResolvedBindings = {};
    for (const [inputField, path] of Object.entries(bindings)) {
      if (!path) continue;
      const value = this.resolve(path);
      if (value !== undefined) {
        result[inputField] = value;
      }
    }
    return result;
  }

  /**
   * Get the confidence score for a specific pillar.
   * Useful to know how much to trust resolved values.
   */
  getConfidence(pillarKey: string): number {
    return this.pillars.get(pillarKey)?.confidence ?? 0;
  }

  /**
   * Get a full pillar content object.
   */
  getPillarContent(pillarKey: string): Record<string, unknown> | undefined {
    return this.pillars.get(pillarKey)?.content;
  }

  /**
   * Check if a pillar path has a non-empty value.
   */
  has(path: PillarPath | string): boolean {
    const value = this.resolve(path);
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  /**
   * Resolve a path, converting complex objects to string for template injection.
   * Arrays are joined. Objects are JSON-stringified.
   */
  resolveAsString(path: PillarPath | string): string {
    const value = this.resolve(path);
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      // Arrays of strings → join. Arrays of objects → JSON.
      if (value.length === 0) return "";
      if (typeof value[0] === "string") return value.join(", ");
      return JSON.stringify(value);
    }
    return JSON.stringify(value);
  }

  /**
   * Resolve all bindings as strings, ready for template substitution.
   * This is what the sequence executor calls to fill {{variables}} in templates.
   */
  resolveBindingsAsStrings(bindings: Partial<Record<string, PillarPath | string>>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [inputField, path] of Object.entries(bindings)) {
      if (!path) continue;
      result[inputField] = this.resolveAsString(path);
    }
    return result;
  }

  /**
   * Diagnostic: list all available pillar keys and their top-level field names.
   */
  inventory(): Record<string, string[]> {
    const inv: Record<string, string[]> = {};
    for (const [key, pillar] of this.pillars) {
      inv[key] = Object.keys(pillar.content);
    }
    return inv;
  }
}
