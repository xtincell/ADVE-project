/**
 * RÉCONCILIATION DE COMPLÉTUDE — garde HARD anti-« 100 % Complet menteur ».
 *
 * Contexte (3 rounds de symptômes, capture SPAWT `tonDeVoix.onNeditPas` vide à
 * « 100 % Complet + tout rempli ») : il existait TROIS notions indépendantes de
 * « champ vide » — le contrat/assessment (PLAT : `is_object` = « objet présent »),
 * le détecteur profond (`findEmptyLeafPaths`), et le renderer. La plus
 * superficielle (le contrat) pilote le % / le pill « Complet » / le bouton
 * Enrichir → un objet imbriqué avec une sous-feuille REQUISE vide passait pour
 * complet (audit : 22 feuilles / 6 piliers).
 *
 * Ce test rend la classe STRUCTURELLEMENT IMPOSSIBLE : pour CHAQUE feuille
 * imbriquée REQUISE de CHAQUE pilier, la vider doit —
 *   (1) la faire apparaître dans `assessment.missing` (aucun angle mort) ;
 *   (2) empêcher `completionPct === 100` (pas de « 100 % » menteur) ;
 *   (3) empêcher `currentStage === "COMPLETE"` (pas de pill « Complet » menteur).
 * + réconciliation directe : toute feuille profonde requise vue vide par le
 * DÉTECTEUR doit être dans `missing` de l'ASSESSMENT (les deux systèmes d'accord).
 *
 * Si un futur champ de schema échappe à l'assessment, ce test échoue → round 4
 * impossible. Pur, sans DB.
 */
import { describe, it, expect } from "vitest";
import { assessPillar } from "@/server/services/pillar-maturity/assessor";
import { listSchemaLeafPaths, findEmptyLeafPaths } from "@/lib/types/pillar-maturity-contracts";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import { setNestedValue, resolvePillarPath } from "@/lib/pillar-path";
import { LAFUSEE_CANON_PILLARS } from "@/server/services/canon/lafusee-canon";
import { MOTION19_CANON_PILLARS } from "@/server/services/canon/motion19-canon";
import { SPAWT_CANON_PILLARS } from "@/server/services/canon/spawt-canon";
import { UPGRADERS_CANON_PILLARS } from "@/server/services/canon/upgraders-canon";

const PILLARS = ["a", "d", "v", "e", "r", "t", "i", "s"] as const;

/** Descend les wrappers Zod (optional/nullable/default/effects/pipe) + branche
 *  la plus structurelle d'une union (objet > tableau > 1ère option). */
function unwrap(z: any): any {
  let c = z;
  for (let i = 0; i < 12; i++) {
    const ctor = c?.constructor?.name;
    if (ctor === "ZodOptional" || ctor === "ZodNullable" || ctor === "ZodDefault" || ctor === "ZodEffects" || ctor === "ZodPipeline" || ctor === "ZodReadonly") {
      c = c._def.innerType ?? c._def.schema ?? c._def.in ?? c._def.out;
      continue;
    }
    if (ctor === "ZodUnion") {
      const o = c._def.options ?? [];
      c = o.find((x: any) => unwrap(x)?.constructor?.name === "ZodObject") ?? o.find((x: any) => unwrap(x)?.constructor?.name === "ZodArray") ?? o[0];
      continue;
    }
    break;
  }
  return c;
}

/** Contenu SCHEMA-VALIDE (tous champs requis + optionnels remplis en profondeur) —
 *  base « pleine » ; on vide ensuite une feuille à la fois. */
function synth(z: any): any {
  const u = unwrap(z);
  const c = u?.constructor?.name ?? "";
  const d = u?._def ?? {};
  if (c === "ZodObject") { const o: any = {}; for (const [k, v] of Object.entries(u.shape ?? {})) o[k] = synth(v); return o; }
  if (c === "ZodArray") { const el = d.element ?? d.type ?? d.innerType; return [synth(el), synth(el)]; }
  if (c === "ZodRecord") return { k: synth(d.valueType ?? d.value) };
  if (c === "ZodEnum") { const e = d.entries; if (e) return Object.values(e)[0]; if (Array.isArray(d.values)) return d.values[0]; return "X"; }
  if (c === "ZodLiteral") return d.value ?? d.values?.[0];
  if (c === "ZodNumber" || c === "ZodBigInt") return 1;
  if (c === "ZodBoolean") return true;
  if (c === "ZodDate") return new Date(0).toISOString();
  if (c === "ZodString") return "valeur test non vide";
  return "x";
}

describe("réconciliation complétude — aucune feuille requise vide ne peut coexister avec « 100 % Complet »", () => {
  for (const p of PILLARS) {
    const schema = (PILLAR_SCHEMAS as any)[p.toUpperCase()];
    // Feuilles REQUISES imbriquées (chaîne d'ancêtres entièrement requise, path profond).
    const requiredNested = listSchemaLeafPaths(p).filter((l) => !l.optional && l.path.includes("."));

    it(`${p.toUpperCase()} — chaque feuille imbriquée requise vidée est VUE (missing + %<100 + pas COMPLETE)`, () => {
      if (requiredNested.length === 0) return; // piliers sans feuille imbriquée requise (I, S)
      const base = synth(schema);
      for (const leaf of requiredNested) {
        const emptied = structuredClone(base);
        setNestedValue(emptied, leaf.path, leaf.isArray ? [] : "");
        const a = assessPillar(p, emptied);
        // (1) angle mort interdit : la feuille vide apparaît dans missing.
        expect(a.missing, `${p}.${leaf.path} invisible dans missing`).toContain(leaf.path);
        // (2) pas de « 100 % » menteur.
        expect(a.completionPct, `${p}.${leaf.path} vide mais 100 %`).toBeLessThan(100);
        // (3) pas de pill « Complet » menteur.
        expect(a.currentStage, `${p}.${leaf.path} vide mais COMPLETE`).not.toBe("COMPLETE");
      }
    });
  }

  it("réconciliation DÉTECTEUR ↔ ASSESSMENT : toute feuille profonde requise vue vide par le détecteur est dans missing", () => {
    for (const p of PILLARS) {
      const schema = (PILLAR_SCHEMAS as any)[p.toUpperCase()];
      const base = synth(schema);
      // Vide TOUTES les feuilles imbriquées requises d'un coup → le détecteur et
      // l'assessment doivent lister exactement le même ensemble (aucun côté aveugle).
      const requiredNested = listSchemaLeafPaths(p).filter((l) => !l.optional && l.path.includes("."));
      const emptied = structuredClone(base);
      for (const leaf of requiredNested) setNestedValue(emptied, leaf.path, leaf.isArray ? [] : "");
      const a = assessPillar(p, emptied);
      const detectorEmpty = findEmptyLeafPaths(p, emptied).filter((l) => !l.optional && l.path.includes("."));
      for (const l of detectorEmpty) {
        expect(a.missing, `${p}.${l.path} vu par le détecteur mais absent de missing`).toContain(l.path);
      }
    }
  });

  // ── Prévention de la classe DATA (mismatch de casse/nom canon ↔ schema) ────
  // Le bug `tonDeVoix.onNeDitPas` (data) vs `onNeditPas` (schema) : la valeur
  // atterrissait sous une clé que le schema/renderer ne lisent pas → champ vide
  // à l'écran alors que la donnée existe. Ces tests gèlent les 4 marques canon.
  const ALL_CANONS = {
    lafusee: LAFUSEE_CANON_PILLARS,
    motion19: MOTION19_CANON_PILLARS,
    spawt: SPAWT_CANON_PILLARS,
    upgraders: UPGRADERS_CANON_PILLARS,
  };
  const isEmptyVal = (v: unknown): boolean =>
    v == null || (typeof v === "string" && v.trim() === "") ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && !Array.isArray(v) && v !== null && Object.keys(v).length === 0);

  it("aucune marque canon n'a une valeur cachée sous une VARIANTE de casse/nom d'une clé de schema", () => {
    const offenders: string[] = [];
    for (const [brand, pillars] of Object.entries(ALL_CANONS)) {
      for (const p of pillars) {
        const content = p.content as Record<string, unknown>;
        for (const leaf of listSchemaLeafPaths(p.key)) {
          if (!leaf.path.includes(".")) continue;
          if (!isEmptyVal(resolvePillarPath(content, leaf.path))) continue;
          const parts = leaf.path.split(".");
          const parent = resolvePillarPath(content, parts.slice(0, -1).join("."));
          if (!parent || typeof parent !== "object") continue;
          const key = parts[parts.length - 1]!.toLowerCase();
          for (const k of Object.keys(parent)) {
            if (k.toLowerCase() === key && k !== parts[parts.length - 1] && !isEmptyVal((parent as any)[k])) {
              offenders.push(`${brand}.${p.key}.${leaf.path} (valeur sous « ${k} »)`);
            }
          }
        }
      }
    }
    expect(offenders, `mismatch casse/nom canon↔schema: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("aucune marque canon n'a de feuille imbriquée REQUISE vide (seed honnêtement complet)", () => {
    const offenders: string[] = [];
    for (const [brand, pillars] of Object.entries(ALL_CANONS)) {
      for (const p of pillars) {
        const empties = findEmptyLeafPaths(p.key, p.content as Record<string, unknown>)
          .filter((l) => !l.optional && l.path.includes("."));
        for (const l of empties) offenders.push(`${brand}.${p.key}.${l.path}`);
      }
    }
    expect(offenders, `feuilles requises vides dans un seed canon: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("découplage ADR-0102 : le NOMBRE requis vide va en needsHuman (jamais derivable/fabriqué)", () => {
    // V.unitEconomics.caVise / budgetCom, T.tamSamSom.*.value sont des NOMBRES —
    // donnée réelle, jamais inférée par LLM. Vidés → needsHuman, pas derivable.
    const v = synth((PILLAR_SCHEMAS as any).V);
    setNestedValue(v, "unitEconomics.caVise", "" as any);
    const av = assessPillar("v", v);
    if (av.missing.includes("unitEconomics.caVise")) {
      expect(av.needsHuman).toContain("unitEconomics.caVise");
      expect(av.derivable).not.toContain("unitEconomics.caVise");
    }
  });
});
