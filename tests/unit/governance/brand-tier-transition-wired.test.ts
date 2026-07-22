/**
 * HARD — les 10 transitions de palier APOGEE sont CÂBLÉES (ADR-0167).
 *
 * Ferme la classe « déclaré mais jamais câblé » diagnostiquée à l'audit
 * registre↔dispatch (RESIDUAL-DEBT §"Intents déclarés jamais câblés") pour la
 * trajectoire APOGEE. Pour chacun des 10 kinds : déclaré au catalogue, SLO
 * apparié, mappé dans KIND_TRANSITIONS, dispatché au runtime (le case existe
 * dans intentTouchesPillars — le switch n'a pas de default, donc son existence
 * prouve le câblage), et — pour les PROMOTE — doté d'un compensateur DEMOTE.
 *
 * La garde compile-time (union Intent → commandant + intentTouchesPillars sans
 * default) est assurée par `tsc`. Ce test ajoute la garde runtime + anti-régression.
 */
import { describe, it, expect } from "vitest";
import { intentKindExists } from "@/server/governance/intent-kinds";
import { SLO_BY_KIND } from "@/server/governance/slos";
import { COMPENSATING_MAP } from "@/server/governance/compensating-intents";
import { intentTouchesPillars } from "@/server/services/mestor/intents";
import {
  KIND_TRANSITIONS,
  PALIER_TRANSITION_KINDS,
  tierTransitionKind,
} from "@/server/services/mestor/gates/palier-promotion-proofs";
import { BRAND_TIERS } from "@/domain";

const PROMOTE_KINDS = [
  "PROMOTE_LATENT_TO_FRAGILE",
  "PROMOTE_FRAGILE_TO_ORDINAIRE",
  "PROMOTE_ORDINAIRE_TO_FORTE",
  "PROMOTE_FORTE_TO_CULTE",
  "PROMOTE_CULTE_TO_ICONE",
] as const;
const DEMOTE_KINDS = [
  "DEMOTE_FRAGILE_TO_LATENT",
  "DEMOTE_ORDINAIRE_TO_FRAGILE",
  "DEMOTE_FORTE_TO_ORDINAIRE",
  "DEMOTE_CULTE_TO_FORTE",
  "DEMOTE_ICONE_TO_CULTE",
] as const;
const ALL = [...PROMOTE_KINDS, ...DEMOTE_KINDS];

describe("brand-tier-transition — les 10 kinds sont câblés (HARD, ADR-0167)", () => {
  it("KIND_TRANSITIONS couvre exactement les 10 kinds (dérivés de la cascade)", () => {
    expect(PALIER_TRANSITION_KINDS.size).toBe(10);
    expect(new Set(Object.keys(KIND_TRANSITIONS))).toEqual(new Set(ALL));
    // La cascade produit bien 5 paires adjacentes (6 paliers - 1).
    expect(BRAND_TIERS.length - 1).toBe(5);
  });

  it.each(ALL)("%s — déclaré au catalogue + SLO apparié", (kind) => {
    expect(intentKindExists(kind)).toBe(true);
    expect(SLO_BY_KIND.has(kind)).toBe(true);
  });

  it.each(ALL)("%s — dispatché au runtime (case existant, ne mute aucun pilier)", (kind) => {
    const meta = KIND_TRANSITIONS[kind]!;
    // intentTouchesPillars n'a pas de default : si le case manquait, l'appel
    // renverrait undefined. On prouve donc que le case existe ET retourne [].
    const touched = intentTouchesPillars({
      kind,
      strategyId: "s1",
      operatorId: "op1",
      reason: "test wiring",
      expectedFromTier: meta.fromTier,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(touched).toEqual([]);
  });

  it.each(PROMOTE_KINDS)("%s — a un compensateur DEMOTE déclaré", (kind) => {
    const comp = COMPENSATING_MAP[kind];
    expect(comp).toBeTruthy();
    expect(comp!.startsWith("DEMOTE_")).toBe(true);
    // Le compensateur inverse bien la transition (from/to échangés).
    const meta = KIND_TRANSITIONS[kind]!;
    const compMeta = KIND_TRANSITIONS[comp!]!;
    expect(compMeta.fromTier).toBe(meta.toTier);
    expect(compMeta.toTier).toBe(meta.fromTier);
  });

  it("tierTransitionKind est cohérent avec KIND_TRANSITIONS (aller-retour)", () => {
    for (const [kind, meta] of Object.entries(KIND_TRANSITIONS)) {
      expect(tierTransitionKind(meta.fromTier, meta.direction)).toBe(kind);
    }
  });
});
