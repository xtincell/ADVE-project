/**
 * SIGNAL GATEWAY — le seul point d'admission d'un signal externe dans
 * l'empreinte d'une marque.
 *
 * LOI : tout signal collecté sur le web (site, réseau, presse, citation, fiche
 * Google, Wikipédia, publicités…) DOIT passer par `admitSignal` avant d'entrer
 * dans les faits d'un rapport client.
 *
 * ── POURQUOI ce module existe (journée du 2026-07-30) ──
 *
 * Trois correctifs successifs ont fermé la MÊME classe de bug, canal par
 * canal, chacun découvert après livraison du précédent :
 *
 *   ADR-0187  site (domaine parqué, mur anti-bot)
 *   ADR-0188  hosts + fiches Maps        → trou trouvé juste après : handles
 *   PR #675   handles sociaux            → et le canal suivant ?
 *
 * Le canal suivant existait bel et bien : `wikipedia` et `ads` étaient
 * interrogés SUR LE NOM SEUL, sans aucune garde — le vecteur exact qui avait
 * mis la fiche Google d'une boutique de mode de Lagos (« Irawo Studio ») dans
 * le rapport d'une plateforme de formation (« Irawo »).
 *
 * Le défaut n'était plus dans les règles mais dans leur DISPERSION : le gate
 * d'entité était appelé à onze endroits, et rien ne garantissait le douzième.
 * Colmater canal par canal ne converge pas.
 *
 * Ce module applique aux signaux la doctrine que le repo a déjà éprouvée sur
 * les piliers (`pillar-gateway` : un point d'écriture unique, LOI 1 du CdC).
 * La règle ESLint `lafusee/no-ungated-footprint-signal` interdit d'écrire un
 * signal sans passer par ici — c'est ce qui ferme la CLASSE de bug au lieu
 * d'une instance de plus.
 *
 * ── CE QUE LE PORTAIL NE FAIT PAS ──
 *
 * Il ne collecte rien et n'invente rien : il rend un VERDICT sur un candidat
 * déjà collecté. Un refus n'est pas une panne — c'est un état honnête
 * (ADR-0046 : ce qui n'est pas prouvé reste absent, jamais deviné).
 */

import type { FieldProvenance } from "@/domain/field-provenance";
import {
  assessHandleExtension,
  assessNameExtension,
  compactTextHasDiscriminant,
  type EntityGate,
} from "@/server/services/seshat/entity-gate";

/** Canal d'où vient le candidat — détermine les gardes applicables. */
export type SignalKind =
  | "site"
  | "social"
  | "press"
  | "citation"
  | "maps"
  | "wikipedia"
  | "ads"
  | "autocomplete";

/**
 * Comment le candidat est arrivé jusqu'ici. Le chemin de CONFIANCE
 * (`DECLARED`, `OWN_SITE`) n'est jamais filtré : le prospect qui déclare son
 * compte, ou le lien lu dans le pied de page de son propre site, font
 * autorité. Seules les DÉCOUVERTES sont jugées.
 */
export type SignalSource = "DECLARED" | "OWN_SITE" | "SEARCH" | "LLM_PROPOSED" | "DIRECT_LOOKUP";

/** Raison du verdict — jamais un booléen nu : le rapport et l'opérateur la lisent. */
export type AdmissionReason =
  | "ADMITTED_DECLARED"
  | "ADMITTED_EXACT_NAME"
  | "ADMITTED_LEGAL_FORM"
  | "ADMITTED_DISCRIMINATED"
  | "REJECTED_NO_MENTION"
  | "REJECTED_AMBIGUOUS_NAME"
  | "REJECTED_EXTENSION_UNDISCRIMINATED"
  | "REJECTED_IMPLAUSIBLE";

export interface SignalVerdict {
  admitted: boolean;
  reason: AdmissionReason;
  /** Traçabilité affichable : d'où vient ce fait (cf. `@/domain/field-provenance`). */
  provenance: FieldProvenance;
  /** Discriminants co-occurrents qui ont validé le candidat (la preuve). */
  matchedDiscriminants: string[];
}

export interface AdmitSignalInput {
  kind: SignalKind;
  /** Le gate d'entité construit pour CETTE marque (ambiguïté + discriminants). */
  gate: EntityGate;
  source: SignalSource;
  /**
   * Nom porté par le candidat : raison sociale d'une fiche Google, handle d'un
   * compte, host d'un domaine. C'est lui qui est testé contre l'extension de
   * nom — le vecteur d'homonymie n°1.
   */
  candidateName?: string | null;
  /** Texte qui atteste le candidat (titre + résumé du hit, contenu de page…). */
  evidence?: string | null;
  /** URL du candidat — un discriminant peut y vivre sous forme compacte. */
  url?: string | null;
  /**
   * Ordre de grandeur revendiqué (abonnés, avis). Un nombre impossible pour le
   * marché est refusé : mesuré 2026-07-30, « Orange Cameroun » remontait
   * 31,7 M d'abonnés pour un pays de 28 M d'habitants — le compte du groupe,
   * pas celui du marché.
   */
  claimedMagnitude?: number | null;
  /** Population du marché déclaré, si connue — borne de vraisemblance. */
  marketPopulation?: number | null;
}

/**
 * Une marque rattachée à UN marché ne peut pas compter plus d'abonnés que ce
 * marché n'a d'habitants : au-delà, le compte relevé est celui du groupe
 * mondial, pas celui du marché — c'est précisément l'erreur à écarter.
 *
 * Calibré sur le cas mesuré 2026-07-30 : « Orange Cameroun » remontait
 * 31 737 324 abonnés pour un pays de ~28 M d'habitants (le compte du groupe
 * Orange). Un ratio plus permissif l'aurait laissé passer et le score social
 * aurait été calculé sur une audience qui n'appartient pas au client.
 *
 * Le garde-fou ne s'applique QUE si la population du marché est connue — sans
 * elle, on ne suppose rien.
 */
const MAX_AUDIENCE_TO_POPULATION_RATIO = 1;

/**
 * Rend un verdict d'admission pour UN candidat. Déterministe, pur, ne lève
 * jamais.
 */
export function admitSignal(input: AdmitSignalInput): SignalVerdict {
  const { gate, source } = input;

  // ── Chemin de confiance : déclaré par le prospect ou lu sur son propre
  // site. Le juger reviendrait à contredire la parole du client sur sa
  // propre marque.
  if (source === "DECLARED" || source === "OWN_SITE") {
    return {
      admitted: true,
      reason: "ADMITTED_DECLARED",
      provenance: source === "DECLARED" ? "HUMAN" : "SOURCE",
      matchedDiscriminants: [],
    };
  }

  // ── Vraisemblance : un ordre de grandeur impossible disqualifie le
  // candidat avant même la question de l'appartenance.
  if (
    typeof input.claimedMagnitude === "number" &&
    typeof input.marketPopulation === "number" &&
    input.marketPopulation > 0 &&
    input.claimedMagnitude > input.marketPopulation * MAX_AUDIENCE_TO_POPULATION_RATIO
  ) {
    return {
      admitted: false,
      reason: "REJECTED_IMPLAUSIBLE",
      provenance: "UNKNOWN",
      matchedDiscriminants: [],
    };
  }

  // ── Appartenance : le candidat parle-t-il de CETTE marque ?
  const evidence = [input.evidence, input.candidateName].filter(Boolean).join(" ").trim();
  const verdict = gate.judge(evidence);
  if (!verdict.accepted) {
    return {
      admitted: false,
      reason:
        verdict.rejection === "AMBIGUOUS_NO_DISCRIMINANT"
          ? "REJECTED_AMBIGUOUS_NAME"
          : "REJECTED_NO_MENTION",
      provenance: "UNKNOWN",
      matchedDiscriminants: verdict.matchedDiscriminants,
    };
  }

  // ── Extension de nom : « Irawo Studio » mentionne authentiquement
  // « Irawo » — la mention seule ne peut donc PAS trancher. Une extension
  // par mot de contenu n'est décidable qu'avec un discriminant ; le nom exact
  // et l'extension purement juridique (« Chococam SA ») passent sur la
  // mention.
  const extension = extensionVerdict(input.kind, input.candidateName, gate.brandName);
  if (extension === "extended") {
    const discriminated =
      verdict.matchedDiscriminants.length > 0 ||
      (!!input.url && compactTextHasDiscriminant(input.url, gate.discriminants)) ||
      (!!input.candidateName && compactTextHasDiscriminant(input.candidateName, gate.discriminants));
    // Sans AUCUN discriminant disponible, rien ne permet de trancher : on ne
    // rejette pas à l'aveugle (« @chococamfmcg » est authentique), la faible
    // couverture du rapport dira elle-même son incertitude.
    if (gate.discriminants.length > 0 && !discriminated) {
      return {
        admitted: false,
        reason: "REJECTED_EXTENSION_UNDISCRIMINATED",
        provenance: "UNKNOWN",
        matchedDiscriminants: verdict.matchedDiscriminants,
      };
    }
    return {
      admitted: true,
      reason: "ADMITTED_DISCRIMINATED",
      provenance: "SOURCE",
      matchedDiscriminants: verdict.matchedDiscriminants,
    };
  }

  return {
    admitted: true,
    reason: extension === "benign" ? "ADMITTED_LEGAL_FORM" : "ADMITTED_EXACT_NAME",
    provenance: "SOURCE",
    matchedDiscriminants: verdict.matchedDiscriminants,
  };
}

/**
 * Le test d'extension dépend de la forme du nom : un handle est collé
 * (`dovvmusic`) et n'a pas de frontière de mot, une raison sociale en a
 * (« Irawo Studio »). Sans candidat nommé, rien à tester.
 */
function extensionVerdict(
  kind: SignalKind,
  candidateName: string | null | undefined,
  brandName: string,
): "exact" | "benign" | "extended" | "unrelated" | "none" {
  if (!candidateName?.trim()) return "none";
  if (kind === "social") return assessHandleExtension(candidateName, brandName);
  return assessNameExtension(candidateName, brandName);
}

/** Libellé opérateur d'un refus — pour le journal `filtered` et le rapport. */
export function admissionReasonLabel(reason: AdmissionReason): string {
  const labels: Record<AdmissionReason, string> = {
    ADMITTED_DECLARED: "déclaré par la marque",
    ADMITTED_EXACT_NAME: "nom exact",
    ADMITTED_LEGAL_FORM: "raison sociale de la marque",
    ADMITTED_DISCRIMINATED: "nom étendu, marché confirmé",
    REJECTED_NO_MENTION: "ne mentionne pas la marque",
    REJECTED_AMBIGUOUS_NAME: "nom ambigu sans contexte discriminant",
    REJECTED_EXTENSION_UNDISCRIMINATED: "nom étendu (homonyme probable) sans confirmation",
    REJECTED_IMPLAUSIBLE: "ordre de grandeur impossible pour ce marché",
  };
  return labels[reason];
}
