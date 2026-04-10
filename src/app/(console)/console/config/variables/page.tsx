"use client";

/**
 * Annuaire des Variables ADVERTIS — Lecture seule
 *
 * Liste TOUTES les variables des 8 piliers avec :
 * - Nom + label humain
 * - Type Zod (string, array, object, number, enum)
 * - Place dans le schema (pilier, chemin)
 * - Règles de forme (type, min/max, required/optional)
 * - Règles de fond (bible : description, format attendu, exemples)
 * - Contrat de maturité (à quel stage le champ est requis)
 * - Relations (derivedFrom, feedsInto)
 */

import { useState, useMemo } from "react";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import { PILLAR_NAMES } from "@/lib/types/advertis-vector";
import { VARIABLE_BIBLE, type VariableSpec } from "@/lib/types/variable-bible";
import {
  Search, ChevronDown, ChevronRight, Database, FileCode, BookOpen,
  ArrowRight, Filter, Layers,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface VariableEntry {
  pillarKey: string;
  pillarName: string;
  fieldKey: string;
  path: string;
  zodType: string;
  required: boolean;
  hasSubFields: boolean;
  subFieldCount: number;
  bible?: VariableSpec;
  maturityStage?: string; // INTAKE, ENRICHED, COMPLETE
}

// ── Extract all variables from schemas ────────────────────────────────

function extractZodType(schema: unknown): { type: string; isOptional: boolean; subShape?: Record<string, unknown> } {
  const def = (schema as { _def?: { typeName?: string; innerType?: unknown; type?: unknown; shape?: unknown } })?._def;
  if (!def) return { type: "unknown", isOptional: false };

  const tn = def.typeName ?? "";

  if (tn.includes("ZodOptional")) {
    const inner = extractZodType(def.innerType);
    return { ...inner, isOptional: true };
  }
  if (tn.includes("ZodString")) return { type: "string", isOptional: false };
  if (tn.includes("ZodNumber")) return { type: "number", isOptional: false };
  if (tn.includes("ZodBoolean")) return { type: "boolean", isOptional: false };
  if (tn.includes("ZodEnum")) {
    const values = (def as { values?: string[] }).values ?? [];
    return { type: `enum(${values.slice(0, 4).join("|")}${values.length > 4 ? "|..." : ""})`, isOptional: false };
  }
  if (tn.includes("ZodArray")) {
    const itemType = extractZodType(def.type);
    return { type: `array<${itemType.type}>`, isOptional: false };
  }
  if (tn.includes("ZodObject")) {
    const shape = (schema as { shape?: Record<string, unknown> }).shape ?? {};
    return { type: "object", isOptional: false, subShape: shape };
  }
  if (tn.includes("ZodRecord")) return { type: "record", isOptional: false };
  if (tn.includes("ZodUnion")) return { type: "union", isOptional: false };

  return { type: tn.replace("Zod", "").toLowerCase(), isOptional: false };
}

function buildVariableList(): VariableEntry[] {
  const entries: VariableEntry[] = [];

  for (const [key, schema] of Object.entries(PILLAR_SCHEMAS)) {
    const pillarKey = key.toLowerCase();
    const pillarName = (PILLAR_NAMES as Record<string, string>)[pillarKey] ?? key;
    const shape = (schema as { shape?: Record<string, unknown> }).shape ?? {};
    const bible = VARIABLE_BIBLE[pillarKey] ?? {};

    for (const [fieldKey, fieldSchema] of Object.entries(shape)) {
      const { type, isOptional, subShape } = extractZodType(fieldSchema);
      const subFieldCount = subShape ? Object.keys(subShape).length : 0;

      entries.push({
        pillarKey,
        pillarName,
        fieldKey,
        path: `${pillarKey}.${fieldKey}`,
        zodType: type,
        required: !isOptional,
        hasSubFields: subFieldCount > 0,
        subFieldCount,
        bible: bible[fieldKey],
      });
    }
  }

  return entries;
}

// ── Pillar colors ─────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  a: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  d: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  v: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  e: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  r: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  t: { text: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  i: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  s: { text: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
};

// ── Component ─────────────────────────────────────────────────────────

export default function VariablesPage() {
  const [search, setSearch] = useState("");
  const [filterPillar, setFilterPillar] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterRequired, setFilterRequired] = useState<boolean | null>(null);
  const [filterHasBible, setFilterHasBible] = useState<boolean | null>(null);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const allVariables = useMemo(() => buildVariableList(), []);

  const filtered = useMemo(() => {
    return allVariables.filter(v => {
      if (search && !v.fieldKey.toLowerCase().includes(search.toLowerCase()) && !v.path.toLowerCase().includes(search.toLowerCase()) && !(v.bible?.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPillar && v.pillarKey !== filterPillar) return false;
      if (filterType && !v.zodType.startsWith(filterType)) return false;
      if (filterRequired === true && !v.required) return false;
      if (filterRequired === false && v.required) return false;
      if (filterHasBible === true && !v.bible) return false;
      if (filterHasBible === false && v.bible) return false;
      return true;
    });
  }, [allVariables, search, filterPillar, filterType, filterRequired, filterHasBible]);

  // Stats
  const totalVars = allVariables.length;
  const withBible = allVariables.filter(v => v.bible).length;
  const requiredCount = allVariables.filter(v => v.required).length;
  const byPillar = Object.entries(PILLAR_NAMES).map(([k, name]) => ({
    key: k, name, count: allVariables.filter(v => v.pillarKey === k).length,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Annuaire des Variables ADVERTIS</h1>
          <p className="text-xs text-foreground-muted mt-1">
            {totalVars} variables · {requiredCount} required · {withBible}/{totalVars} documentees dans la bible
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Database className="h-3.5 w-3.5" /> Schema Zod
          <FileCode className="h-3.5 w-3.5 ml-2" /> Contrats
          <BookOpen className="h-3.5 w-3.5 ml-2" /> Bible
        </div>
      </div>

      {/* Pillar tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilterPillar(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!filterPillar ? "bg-white/15 text-white" : "bg-white/5 text-foreground-muted hover:bg-white/10"}`}
        >
          Tous ({totalVars})
        </button>
        {byPillar.map(p => {
          const colors = PILLAR_COLORS[p.key] ?? { text: "", bg: "", border: "" };
          return (
            <button
              key={p.key}
              onClick={() => setFilterPillar(filterPillar === p.key ? null : p.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPillar === p.key ? `${colors.bg} ${colors.text} ${colors.border} border` : "bg-white/5 text-foreground-muted hover:bg-white/10"}`}
            >
              {p.key.toUpperCase()} ({p.count})
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            placeholder="Rechercher une variable..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/20"
          />
        </div>
        <select
          value={filterType ?? ""}
          onChange={e => setFilterType(e.target.value || null)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
        >
          <option value="">Type: Tous</option>
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="array">array</option>
          <option value="object">object</option>
          <option value="enum">enum</option>
          <option value="record">record</option>
          <option value="union">union</option>
        </select>
        <button
          onClick={() => setFilterRequired(filterRequired === true ? null : true)}
          className={`rounded-lg border px-3 py-2 text-xs transition-colors ${filterRequired === true ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-foreground-muted hover:bg-white/10"}`}
        >
          Required
        </button>
        <button
          onClick={() => setFilterHasBible(filterHasBible === true ? null : true)}
          className={`rounded-lg border px-3 py-2 text-xs transition-colors ${filterHasBible === true ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : "border-white/10 bg-white/5 text-foreground-muted hover:bg-white/10"}`}
        >
          <BookOpen className="h-3 w-3 inline mr-1" /> Documentee
        </button>
        <button
          onClick={() => setFilterHasBible(filterHasBible === false ? null : false)}
          className={`rounded-lg border px-3 py-2 text-xs transition-colors ${filterHasBible === false ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/5 text-foreground-muted hover:bg-white/10"}`}
        >
          Non documentee
        </button>
      </div>

      {/* Results count */}
      <p className="text-[10px] text-foreground-muted">
        {filtered.length} variable{filtered.length > 1 ? "s" : ""} affichee{filtered.length > 1 ? "s" : ""}
      </p>

      {/* Variable list */}
      <div className="space-y-1">
        {filtered.map(v => {
          const colors = PILLAR_COLORS[v.pillarKey] ?? { text: "", bg: "", border: "" };
          const isExpanded = expandedPath === v.path;

          return (
            <div key={v.path}>
              <div
                onClick={() => setExpandedPath(isExpanded ? null : v.path)}
                className={`cursor-pointer rounded-lg border bg-surface-raised p-3 transition-colors hover:bg-white/[0.04] ${isExpanded ? `${colors.border}` : "border-white/5"}`}
              >
                <div className="flex items-center gap-3">
                  {/* Expand indicator */}
                  {v.bible || v.hasSubFields ? (
                    isExpanded ? <ChevronDown className="h-3 w-3 text-foreground-muted flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-foreground-muted flex-shrink-0" />
                  ) : <div className="w-3" />}

                  {/* Pillar badge */}
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${colors.bg} ${colors.text}`}>
                    {v.pillarKey.toUpperCase()}
                  </span>

                  {/* Field name */}
                  <span className="text-sm font-medium text-white min-w-[140px]">{v.fieldKey}</span>

                  {/* Type badge */}
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-foreground-muted font-mono">
                    {v.zodType}
                  </span>

                  {/* Required badge */}
                  {v.required ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-300">required</span>
                  ) : (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-foreground-muted/50">optional</span>
                  )}

                  {/* Bible badge */}
                  {v.bible ? (
                    <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] text-violet-300">
                      <BookOpen className="h-2.5 w-2.5 inline mr-0.5" />bible
                    </span>
                  ) : null}

                  {/* Sub-field count */}
                  {v.subFieldCount > 0 ? (
                    <span className="text-[9px] text-foreground-muted">{v.subFieldCount} sous-champs</span>
                  ) : null}

                  {/* Description preview */}
                  <span className="flex-1 text-[11px] text-foreground-muted truncate ml-2">
                    {v.bible?.description ?? ""}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded ? (
                <div className={`ml-8 mt-1 mb-2 rounded-lg border ${colors.border} bg-white/[0.02] p-4 space-y-3`}>
                  {/* Schema info */}
                  <div>
                    <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide mb-1">
                      <Database className="h-3 w-3 inline mr-1" />Schema Zod
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-white/5 px-2 py-1 font-mono">{v.path}</span>
                      <span className="rounded bg-white/5 px-2 py-1 font-mono">{v.zodType}</span>
                      <span className={`rounded px-2 py-1 ${v.required ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-foreground-muted"}`}>
                        {v.required ? "REQUIRED" : "OPTIONAL"}
                      </span>
                    </div>
                  </div>

                  {/* Bible info */}
                  {v.bible ? (
                    <div>
                      <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide mb-1">
                        <BookOpen className="h-3 w-3 inline mr-1" />Bible de format
                      </p>
                      <div className="space-y-2 text-xs">
                        <p className="text-white/80">{v.bible.description}</p>
                        <div className="rounded bg-white/5 p-2">
                          <p className="text-[10px] text-foreground-muted mb-0.5">Format attendu :</p>
                          <p className="text-white/70">{v.bible.format}</p>
                        </div>
                        {v.bible.examples && v.bible.examples.length > 0 ? (
                          <div className="rounded bg-white/5 p-2">
                            <p className="text-[10px] text-foreground-muted mb-0.5">Exemples :</p>
                            {v.bible.examples.map((ex, i) => (
                              <p key={i} className="text-white/60 italic">{ex}</p>
                            ))}
                          </div>
                        ) : null}
                        {v.bible.rules && v.bible.rules.length > 0 ? (
                          <div className="rounded bg-white/5 p-2">
                            <p className="text-[10px] text-foreground-muted mb-0.5">Regles :</p>
                            <ul className="space-y-0.5">
                              {v.bible.rules.map((rule, i) => (
                                <li key={i} className="text-white/60">• {rule}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {v.bible.minLength || v.bible.maxLength ? (
                          <p className="text-foreground-muted">
                            Longueur : {v.bible.minLength ? `min ${v.bible.minLength}` : ""}{v.bible.minLength && v.bible.maxLength ? " · " : ""}{v.bible.maxLength ? `max ${v.bible.maxLength}` : ""} chars
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded border border-dashed border-white/10 p-3 text-center">
                      <p className="text-xs text-foreground-muted">Pas de documentation dans la bible</p>
                      <p className="text-[10px] text-foreground-muted/50 mt-0.5">Format de fond non codifie — risque de format incorrect dans les recos</p>
                    </div>
                  )}

                  {/* Relations */}
                  {(v.bible?.derivedFrom || (v.bible?.feedsInto && v.bible.feedsInto.length > 0)) ? (
                    <div>
                      <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide mb-1">
                        <Layers className="h-3 w-3 inline mr-1" />Relations
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {v.bible?.derivedFrom ? (
                          <span className="flex items-center gap-1 rounded bg-sky-500/10 px-2 py-1 text-sky-300">
                            <ArrowRight className="h-3 w-3 rotate-180" /> {v.bible.derivedFrom}
                          </span>
                        ) : null}
                        {v.bible?.feedsInto?.map(target => (
                          <span key={target} className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-amber-300">
                            <ArrowRight className="h-3 w-3" /> {target}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
