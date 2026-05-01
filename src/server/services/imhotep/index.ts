/**
 * Imhotep — Crew Programs handler stub Oracle-only (Phase 13, B9, ADR-0017).
 *
 * Handler minimal pour `IMHOTEP_DRAFT_CREW_PROGRAM` — retourne un placeholder
 * structuré pour la section dormante Oracle `imhotep-crew-program-dormant`.
 *
 * **Cap 7 BRAINS preserved** : Imhotep N'EST PAS ajouté à BRAINS const ;
 * il reste pré-réservé. Ce handler est une **sortie partielle Oracle-only**
 * documentée ADR-0017.
 *
 * APOGEE — Sous-système Crew Programs (Ground #6). Activation Phase 7+
 * (matching talent, crew composition, formation Académie). Cf. ADR-0010.
 */

import type {
  ImhotepDraftCrewProgramPayload,
  ImhotepCrewProgramPlaceholder,
} from "./types";

export async function draftCrewProgram(
  payload: ImhotepDraftCrewProgramPayload,
): Promise<ImhotepCrewProgramPlaceholder> {
  return {
    placeholder: payload.sector
      ? `Crew program ${payload.sector} — pré-réservé Imhotep (Phase 7+ activation pending). Cf. ADR-0010 + ADR-0017.`
      : "Crew program — pré-réservé Imhotep (Phase 7+ activation pending). Cf. ADR-0010 + ADR-0017.",
    status: "DORMANT_PRE_RESERVED",
    adrRefs: ["ADR-0010", "ADR-0017"],
    scaffoldedAt: new Date().toISOString(),
  };
}
