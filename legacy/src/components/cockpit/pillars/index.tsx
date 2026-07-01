"use client";

/**
 * Bespoke pillar renderers registry.
 *
 * Maps a pillar key (a·d·v·e·r·t·i·s) to its hyper-detailed field renderer
 * (porté du handoff claude.ai/design). `pillar-page.tsx` consulte ce registre :
 * si un renderer bespoke existe pour le pilier, il remplace la grille générique
 * AutoField ; sinon, fallback sur la grille générique. Le shell gouverné
 * (toolbar, score, panneaux, modals) reste identique dans les deux cas.
 */

import type { ComponentType } from "react";
import type { Rec } from "./pillar-kit";
import { PillarAFields } from "./pillar-a-fields";
import { PillarDFields } from "./pillar-d-fields";
import { PillarVFields } from "./pillar-v-fields";
import { PillarEFields } from "./pillar-e-fields";
import { PillarRFields } from "./pillar-r-fields";
import { PillarTFields } from "./pillar-t-fields";
import { PillarIFields } from "./pillar-i-fields";
import { PillarSFields } from "./pillar-s-fields";

export type BespokePillarProps = { content: Rec; certainty: Record<string, string> | null | undefined };

export const BESPOKE_PILLAR_RENDERERS: Partial<Record<string, ComponentType<BespokePillarProps>>> = {
  a: PillarAFields,
  d: PillarDFields,
  v: PillarVFields,
  e: PillarEFields,
  r: PillarRFields,
  t: PillarTFields,
  i: PillarIFields,
  s: PillarSFields,
};
