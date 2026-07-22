/**
 * brand-book-ingestion/persister.ts — écrit une extraction de brand book RÉVISÉE
 * vers les piliers A/D/V (via le gateway) + les assets vault visuels (ADR-0173).
 *
 * Invariants :
 *   - **Zéro fabrication** : on n'écrit QUE les champs réellement présents (non-null)
 *     dans l'extraction ; un `null` n'écrit rien.
 *   - **Gateway obligatoire** : toute écriture pilier passe par `writePillarAndScore`
 *     (C5), `author.system:"INGESTION"`, provenance SOURCE (fait observé) ou INFERRED
 *     (jugement, ex. archétype) via `fieldProvenance`.
 *   - **Mapping conservateur** : seuls les champs qui accueillent proprement une valeur
 *     de brand book sont écrits (chaînes d'identité, sous-promesses, personas). Les
 *     produits / valeurs Schwartz (schémas riches à matrice) ne sont PAS auto-écrits
 *     (ils exigeraient d'inventer la matrice de valeur / l'enum) — l'extraction brute
 *     est conservée dans l'asset BRAND_BOOK pour promotion opérateur ultérieure.
 *   - **Assets visuels en DRAFT** (comme source-classifier) : l'opérateur promeut.
 */
import { writePillarAndScore } from "@/server/services/pillar-gateway";
import { createBrandAsset } from "@/server/services/brand-vault/engine";
import type { FieldProvenance } from "@/domain/field-provenance";
import type { BrandBookExtraction } from "./schema";

const trunc = (v: string, max: number) => (v.length <= max ? v : v.slice(0, max - 1).trimEnd() + "…");

interface FieldWrite {
  path: string;
  value: unknown;
  provenance: FieldProvenance;
}

/** Construit les écritures A/D/V à partir de l'extraction (champs présents seulement). */
function buildPillarWrites(x: BrandBookExtraction): Record<"a" | "d" | "v", FieldWrite[]> {
  const a: FieldWrite[] = [];
  const d: FieldWrite[] = [];
  const v: FieldWrite[] = [];
  const push = (arr: FieldWrite[], path: string, value: unknown, provenance: FieldProvenance = "SOURCE") => {
    if (value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "") && !(Array.isArray(value) && value.length === 0)) {
      arr.push({ path, value, provenance });
    }
  };

  // ── Pilier A ──
  const id = x.identity;
  if (id) {
    push(a, "nomMarque", id.brandName);
    if (id.tagline) push(a, "accroche", trunc(id.tagline, 100));
    push(a, "description", id.mission);
    push(a, "missionStatement", id.mission ? trunc(id.mission, 200) : null);
    push(a, "noyauIdentitaire", id.vision); // vision seulement — pas de repli sur story (double-assertion)
    if (id.story) push(a, "originMyth", { elevator: trunc(id.story, 400) });
    // manifesto → PAS écrit en prophecy (concepts distincts) — conservé brut dans l'asset BRAND_BOOK.
    // Jugement → INFERRED (needsHuman). archetype attend un enum : on ne l'écrit PAS
    // en dur (risque hors-enum) — seulement une note libre si le champ existe.
  }

  // ── Pilier D ──
  const di = x.distinction;
  if (di) {
    if (di.positioning) push(d, "positionnement", trunc(di.positioning, 200));
    push(d, "promesseMaitre", di.masterPromise);
    push(d, "sousPromesses", di.subPromises); // union accepte string[] (ADR-0168)
    // tonDeVoix est un champ de D (pas A) — la voix de marque du book y atterrit.
    if (id?.toneOfVoice?.length) push(d, "tonDeVoix", { personnalite: id.toneOfVoice });
    if (di.personas?.length) {
      // rank = ordre de listing du book (ordinal requis, pas une assertion de primauté) ;
      // motivations écrit SEULEMENT si présent (jamais le nom en repli — ce serait fabriqué).
      push(
        d,
        "personas",
        di.personas.map((p, i) => ({ name: p.name, rank: i + 1, ...(p.description ? { motivations: p.description } : {}) })),
      );
    }
  }

  // ── Pilier V ──
  const va = x.value;
  if (va) {
    push(v, "promesseDeValeur", va.valueProposition);
    // produits / système : conservés bruts dans l'asset BRAND_BOOK (promotion opérateur).
  }

  return { a, d, v };
}

export interface BrandBookPersistResult {
  /** true ssi au moins un champ ou asset a été écrit (distinct de « l'intent a tourné »). */
  wrote: boolean;
  pillarsWritten: string[];
  fieldsWritten: number;
  assetsCreated: string[];
  warnings: string[];
}

/**
 * Persiste une extraction révisée. `sourceDataSourceId` (optionnel) lie les assets
 * au `BrandDataSource` uploadé. Retourne un résumé honnête (rien d'inventé).
 */
export async function persistBrandBookExtraction(args: {
  strategyId: string;
  operatorId: string;
  extraction: BrandBookExtraction;
  sourceFilename?: string;
  sourceDataSourceId?: string;
}): Promise<BrandBookPersistResult> {
  const { strategyId, operatorId, extraction } = args;
  const writes = buildPillarWrites(extraction);
  const pillarsWritten: string[] = [];
  const assetsCreated: string[] = [];
  const warnings: string[] = [];
  let fieldsWritten = 0;

  for (const key of ["a", "d", "v"] as const) {
    const fw = writes[key];
    if (fw.length === 0) continue;
    const fieldProvenance: Record<string, FieldProvenance> = {};
    for (const f of fw) fieldProvenance[f.path] = f.provenance;
    const res = await writePillarAndScore({
      strategyId,
      pillarKey: key,
      operation: { type: "SET_FIELDS", fields: fw.map((f) => ({ path: f.path, value: f.value })) },
      author: { system: "INGESTION", userId: operatorId, reason: `Ingestion brand book${args.sourceFilename ? ` (${args.sourceFilename})` : ""}` },
      options: { fieldProvenance, targetStatus: "DRAFT" },
    });
    if (res.success) {
      pillarsWritten.push(key.toUpperCase());
      fieldsWritten += fw.length;
    } else {
      warnings.push(`Pilier ${key.toUpperCase()} non écrit : ${res.error ?? "raison inconnue"}`);
    }
  }

  // ── Assets vault visuels (DRAFT — l'opérateur promeut, cf. source-classifier) ──
  const vis = extraction.visual;
  const officialColors = vis?.colors?.filter((c) => c.hex) ?? [];
  if (officialColors.length) {
    const asset = await createBrandAsset({
      strategyId,
      operatorId,
      name: "Palette (brand book)",
      kind: "CHROMATIC_STRATEGY",
      content: { colors: officialColors, source: "brand-book-ingestion" },
      pillarSource: "D",
      state: "DRAFT",
      metadata: { sourceDataSourceId: args.sourceDataSourceId, ingested: true },
    });
    if (asset?.id) assetsCreated.push(asset.id);
  }
  if (vis?.fonts?.length) {
    const asset = await createBrandAsset({
      strategyId,
      operatorId,
      name: "Typographie (brand book)",
      kind: "TYPOGRAPHY_SYSTEM",
      content: { fonts: vis.fonts, source: "brand-book-ingestion" },
      pillarSource: "D",
      state: "DRAFT",
      metadata: { sourceDataSourceId: args.sourceDataSourceId, ingested: true },
    });
    if (asset?.id) assetsCreated.push(asset.id);
  }

  return { wrote: pillarsWritten.length > 0 || assetsCreated.length > 0, pillarsWritten, fieldsWritten, assetsCreated, warnings };
}
