/**
 * Livre de marque — composition déterministe depuis l'ADVE ET les documents.
 *
 * Demande opérateur, deux fois : *« un brandbook au format de la Fusée est censé
 * exister et puiser dans les sources et l'advertis pour se formaliser afin de
 * devenir la seule source de vérité (avec vue html et export pdf, comme
 * l'oracle) »*.
 *
 * Ce qui existait ne répondait pas à ça : `brand-bible-pdf.ts` compile les
 * sorties de la séquence Glory `BRANDBOOK-D` — des briefs produits par modèle,
 * sur le seul pilier Distinction. C'est un livrable créatif, pas un état des
 * lieux. Il ne lit ni les piliers fondateurs, ni un seul document de la marque.
 *
 * Ici : **zéro LLM**. On assemble ce qui est DÉJÀ déclaré —
 *
 *  - les huit piliers, champ par champ, dans l'ordre canonique du registre
 *    (`FIELD_REGISTRY`), avec le libellé canonique et la provenance réelle de
 *    chaque valeur (humaine / document / inférée) ;
 *  - les extraits de documentation qui parlent de chaque pilier, **avec leur
 *    identifiant de source**, via le même RAG que le reste de l'OS.
 *
 * Ce qui n'est ni déclaré ni documenté reste **vide et le dit**. Un livre de
 * marque qui comblerait ses trous ne serait plus une référence — ce serait la
 * fabrication la mieux reliée du système, exactement ce que l'ancrage
 * documentaire (ADR-0184) cherche à empêcher.
 *
 * C'est ce qui en fait le **rang 2 de la cascade d'ancrage** : quand aucun
 * document ne parle d'un champ, c'est ce document consolidé qui fait référence,
 * pas une invention.
 */

import { db } from "@/lib/db";
import {
  ADVE_STORAGE_KEYS,
  PILLAR_METADATA,
  PILLAR_STORAGE_KEYS,
  type PillarKey,
  type PillarStorageKey,
} from "@/domain/pillars";
import { assessAllPillarsHealth } from "@/server/services/neteru-shared/pillar-directors";
import { coerceProvenance, type FieldProvenance } from "@/domain/field-provenance";
import type { SourceCertainty } from "@/domain/source-certainty";
import { FIELD_REGISTRY } from "@/lib/types/field-registry";
import {
  loadBrandSourceContext,
  type SourceRetrievalMode,
} from "@/server/services/notoria/source-context";

/** Une valeur du livre : ce qu'elle dit, d'où elle vient. */
export interface BibleEntry {
  field: string;
  label: string;
  /** Valeur déclarée, telle quelle. `null` quand le champ est vide. */
  value: unknown;
  /** HUMAN (décidé) · SOURCE (tiré d'un document) · INFERRED (déduit) · UNKNOWN. */
  provenance: FieldProvenance;
}

/** Un extrait de la documentation, rattaché à son document. */
export interface BibleCitation {
  sourceId: string;
  fileName: string;
  certainty: SourceCertainty;
  excerpt: string;
}

export interface BibleSection {
  pillarKey: PillarKey;
  storageKey: PillarStorageKey;
  /** « Authenticité », « Distinction »… — canon `PILLAR_METADATA`. */
  title: string;
  role: string;
  blurb: string;
  /** Champs renseignés, dans l'ordre du registre. */
  entries: BibleEntry[];
  /** Champs du registre restés vides — nommés, pas masqués. */
  missing: Array<{ field: string; label: string }>;
  citations: BibleCitation[];
  /** Complétude canonique du pilier (`completionPct`). `null` si non mesurée. */
  completionPct: number | null;
}

export interface BrandBibleDocument {
  strategyId: string;
  brandName: string;
  generatedAt: Date;
  sections: BibleSection[];
  coverage: { filled: number; total: number; pct: number | null };
  /** Documents de la marque réellement cités dans ce livre. */
  sourcesUsed: number;
  /** Comment les extraits ont été choisis — dégradation dite, pas subie. */
  retrieval: SourceRetrievalMode;
}

/** Vide au sens du livre : rien à montrer, donc rien à prétendre. */
function isEmptyValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/** Budget d'extraits par pilier — assez pour situer, pas pour recopier. */
const CITATION_BUDGET = 2_400;
const MAX_CITATIONS_PER_SECTION = 3;

/**
 * Compose le livre de marque d'une stratégie.
 *
 * @param opts.includeDerived Inclure les piliers dérivés R/T/I/S (diagnostic).
 *        Par défaut on ne publie que le socle fondateur A/D/V/E : c'est lui qui
 *        fait référence ; le reste est un outil de lecture, pas une déclaration.
 */
export async function composeBrandBible(
  strategyId: string,
  opts: { includeDerived?: boolean } = {},
): Promise<BrandBibleDocument> {
  const includeDerived = opts.includeDerived ?? false;

  const [strategy, pillars] = await Promise.all([
    db.strategy.findUnique({ where: { id: strategyId }, select: { name: true } }),
    db.pillar.findMany({ where: { strategyId }, select: { key: true, content: true } }),
  ]);

  const byKey = new Map(
    pillars.map((p) => [p.key.toLowerCase(), (p.content ?? {}) as Record<string, unknown>]),
  );

  const founderKeys: readonly string[] = ADVE_STORAGE_KEYS;
  const keys = PILLAR_STORAGE_KEYS.filter((k) => (includeDerived ? true : founderKeys.includes(k)));

  // Complétude = LA mesure canonique du repo (`completionPct`, contrats de
  // maturité), pas un pourcentage maison. Deux chiffres rivaux sur le même
  // sujet, c'est la dérive qu'on passe notre temps à réparer ailleurs.
  const health = await assessAllPillarsHealth(strategyId).catch(() => []);
  const completionByKey = new Map(
    health.map((h) => [String(h.pillarKey).toLowerCase(), h.completeness]),
  );

  const sections: BibleSection[] = [];
  const citedSources = new Set<string>();
  // Le mode de récupération est le MÊME pour toutes les sections (même index,
  // même provider) — on retient le premier observé, et « NONE » si la marque
  // n'a aucune documentation exploitable.
  let retrieval: SourceRetrievalMode = "NONE";

  for (const storageKey of keys) {
    const meta = PILLAR_METADATA[storageKey.toUpperCase() as PillarKey];
    const content = byKey.get(storageKey) ?? {};
    const provenanceMap = (content._fieldProvenance ?? {}) as Record<string, unknown>;
    const registry = FIELD_REGISTRY[storageKey] ?? {};

    const entries: BibleEntry[] = [];
    const missing: Array<{ field: string; label: string }> = [];

    for (const [field, def] of Object.entries(registry)) {
      const value = content[field];
      if (isEmptyValue(value)) {
        missing.push({ field, label: def.label });
        continue;
      }
      entries.push({
        field,
        label: def.label,
        value,
        provenance: coerceProvenance(provenanceMap[field]),
      });
    }

    // Le registre n'est PAS l'inventaire du pilier — il en décrit un sous-ensemble
    // (13 champs sur A, quand une marque documentée en porte 32). Ne parcourir que
    // le registre rendait donc **invisible** toute valeur déclarée hors registre :
    // ni affichée, ni comptée, ni nommée parmi les manquants. Le lecteur voyait
    // « 98 % complété · 0 manquant » pendant que l'équipe dirigeante — corrigée à
    // la main le jour même — n'apparaissait nulle part.
    //
    // Ce n'est pas de la fabrication, mais c'est la même famille : une omission
    // silencieuse dans un document dont la promesse est « ce qui manque est
    // NOMMÉ ». On parcourt donc l'union, registre d'abord (il porte le libellé
    // canonique et l'ordre), puis le reste du pilier — libellé = nom du champ,
    // faute de mieux, ce qui est honnête et vérifiable.
    const known = new Set(Object.keys(registry));
    for (const [field, value] of Object.entries(content)) {
      if (field.startsWith("_") || known.has(field)) continue;
      if (isEmptyValue(value)) continue;
      entries.push({
        field,
        label: field,
        value,
        provenance: coerceProvenance(provenanceMap[field]),
      });
    }

    // Les extraits qui parlent de CE pilier. La requête est faite des libellés
    // réellement renseignés — on cherche ce dont la marque parle, pas un thème
    // abstrait.
    const query = [meta.displayName, meta.role, ...entries.slice(0, 12).map((e) => e.label)].join(" ");
    const ctx = await loadBrandSourceContext(strategyId, {
      query,
      budget: CITATION_BUDGET,
      maxDocuments: MAX_CITATIONS_PER_SECTION,
    });
    if (ctx.retrieval !== "NONE") retrieval = ctx.retrieval;

    const citations: BibleCitation[] = ctx.excerpts.slice(0, MAX_CITATIONS_PER_SECTION).map((e) => {
      citedSources.add(e.sourceId);
      return {
        sourceId: e.sourceId,
        fileName: e.fileName,
        certainty: e.certainty,
        excerpt: e.text,
      };
    });

    sections.push({
      pillarKey: meta.key,
      storageKey,
      title: meta.displayName,
      role: meta.role,
      blurb: meta.blurb,
      entries,
      missing,
      citations,
      completionPct: completionByKey.get(storageKey) ?? null,
    });
  }

  return {
    strategyId,
    brandName: strategy?.name ?? "Marque",
    generatedAt: new Date(),
    sections,
    coverage: {
      /** Éléments réellement renseignés, tous volets confondus. */
      filled: sections.reduce((n, s) => n + s.entries.length, 0),
      /** Éléments prévus au registre. */
      total: sections.reduce((n, s) => n + s.entries.length + s.missing.length, 0),
      /**
       * Complétude CANONIQUE moyenne des volets présentés (`completionPct`,
       * contrats de maturité) — le même chiffre que partout ailleurs dans le
       * cockpit. `null` si la mesure est indisponible : on n'en invente pas.
       */
      pct: (() => {
        const measured = sections
          .map((s) => s.completionPct)
          .filter((v): v is number => typeof v === "number");
        return measured.length > 0
          ? Math.round(measured.reduce((a, b) => a + b, 0) / measured.length)
          : null;
      })(),
    },
    sourcesUsed: citedSources.size,
    retrieval,
  };
}
