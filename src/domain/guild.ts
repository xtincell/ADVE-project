/**
 * Domaine Guilde — pur TS, zéro IO (WP-011).
 *
 * L'essence d'ADR-0098 legacy (« La Guilde : portail public du marketplace
 * crew ») réduite à sa mécanique déterministe :
 *
 *   Talent (profil unique par compte : headline, compétences, ville/marché)
 *   Mission ouverte à la Guilde (gate opérateur `openToGuild`, mission OPEN)
 *     → mur des missions CROSS-WORKSPACE, projeté SANS donnée de marque
 *   Candidature (pitch, unique par mission × talent)
 *     → APPLIED → SHORTLISTED → ACCEPTED / DECLINED (sans retour)
 *   Accepter = la mission passe ASSIGNED au talent, les candidatures sœurs
 *   encore ouvertes passent DECLINED (décision unique, transactionnelle).
 *
 * Tout ici est une fonction PURE : gates testables sans DB, projection du mur
 * testable contre la fuite de données marque. Les statuts miroir des enums
 * Prisma sont des unions littérales — le domaine ne dépend jamais du client.
 */

import type { MissionStatus } from "./campaign";

// ── Statuts (miroirs des enums Prisma tranche 3) ───────────────────────

export const TALENT_AVAILABILITIES = ["AVAILABLE", "BUSY", "UNAVAILABLE"] as const;
export type TalentAvailability = (typeof TALENT_AVAILABILITIES)[number];

export const TALENT_VISIBILITIES = ["VISIBLE", "HIDDEN"] as const;
export type TalentVisibility = (typeof TALENT_VISIBILITIES)[number];

export const APPLICATION_STATUSES = [
  "APPLIED",
  "SHORTLISTED",
  "ACCEPTED",
  "DECLINED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Libellés FR (registre client — jamais d'enum brut à l'écran). */
export const AVAILABILITY_LABELS: Record<TalentAvailability, string> = {
  AVAILABLE: "Disponible",
  BUSY: "En mission",
  UNAVAILABLE: "Indisponible",
};

export const VISIBILITY_LABELS: Record<TalentVisibility, string> = {
  VISIBLE: "Visible",
  HIDDEN: "Masqué",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Envoyée",
  SHORTLISTED: "Shortlistée",
  ACCEPTED: "Acceptée",
  DECLINED: "Déclinée",
};

// ── Gates (chaque prédicat porte sa raison de refus, prête à afficher) ──

export type GateCheck = { ok: true } | { ok: false; reason: string };

/**
 * Machine d'états d'une candidature : la shortlist est optionnelle (une
 * candidature s'accepte ou se décline directement), les décisions finales
 * (ACCEPTED / DECLINED) sont terminales — jamais de retour.
 */
export const APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  APPLIED: ["SHORTLISTED", "ACCEPTED", "DECLINED"],
  SHORTLISTED: ["ACCEPTED", "DECLINED"],
  ACCEPTED: [],
  DECLINED: [],
};

export function canTransitionApplication(
  from: ApplicationStatus,
  to: ApplicationStatus,
): GateCheck {
  if (APPLICATION_TRANSITIONS[from].includes(to)) return { ok: true };
  return {
    ok: false,
    reason:
      `Passage « ${APPLICATION_STATUS_LABELS[from]} » → « ${APPLICATION_STATUS_LABELS[to]} » impossible — ` +
      "une candidature suit envoyée → (shortlistée) → acceptée ou déclinée, sans retour.",
  };
}

/**
 * Gate « ouvrir / fermer à la Guilde » : seule une mission encore OUVERTE se
 * publie sur le mur (ou s'en retire) — une mission assignée, livrée ou validée
 * n'a plus rien à y faire.
 */
export function canToggleGuild(missionStatus: MissionStatus): GateCheck {
  if (missionStatus !== "OPEN") {
    return {
      ok: false,
      reason:
        "Seule une mission encore ouverte se publie sur le mur de la Guilde — " +
        "celle-ci a déjà quitté l'étape « Ouverte ».",
    };
  }
  return { ok: true };
}

/** Gate « candidater » : mission OPEN et publiée sur le mur, rien d'autre. */
export function canApplyToMission(
  missionStatus: MissionStatus,
  openToGuild: boolean,
): GateCheck {
  if (missionStatus !== "OPEN" || !openToGuild) {
    return {
      ok: false,
      reason:
        "Cette mission n'est plus ouverte aux candidatures — elle a été retirée du mur ou déjà assignée.",
    };
  }
  return { ok: true };
}

/**
 * Gate « décider » (shortlist / accepter / décliner) : la mission doit être
 * encore OPEN (une mission assignée a déjà son talent) et la transition de
 * candidature légale.
 */
export function canDecideApplication(
  missionStatus: MissionStatus,
  from: ApplicationStatus,
  to: ApplicationStatus,
): GateCheck {
  if (missionStatus !== "OPEN") {
    return {
      ok: false,
      reason:
        "Cette mission n'est plus ouverte — les candidatures ne se décident que tant qu'aucun talent n'est assigné.",
    };
  }
  return canTransitionApplication(from, to);
}

// ── Projection publique du mur (anti-fuite — l'essence d'ADR-0098) ─────

/**
 * Entrée BRUTE d'une mission candidate au mur : tout ce que la DB sait
 * remonter (dont les données de marque). La projection n'en laisse passer
 * que le strict nécessaire au talent.
 */
export type WallMissionSource = {
  id: string;
  title: string;
  createdAt: Date;
  /** Libellé du type d'action (référentiel : « Séance photo… ») — jamais la campagne. */
  actionKindLabel: string;
  /** Marché de la campagne (nom du pays + code) — le talent doit savoir où. */
  marketName: string;
  marketCode: string;
};

/**
 * Mission telle qu'affichée sur le mur : AUCUN identifiant de marque, de
 * workspace, de campagne, aucun objectif, aucun budget. La mise en relation
 * passe par la candidature — jamais en direct (doctrine ADR-0098 reconduite).
 */
export type WallMission = {
  id: string;
  title: string;
  kindLabel: string;
  market: string;
  createdAt: Date;
};

/** Clés autorisées à sortir sur le mur — la liste EST le contrat (testé). */
export const WALL_MISSION_KEYS = ["id", "title", "kindLabel", "market", "createdAt"] as const;

/**
 * Projette une mission vers sa forme publique de mur. Fonction totale et
 * pure : elle CONSTRUIT l'objet champ par champ (whitelist), elle ne filtre
 * pas un objet riche — une donnée de marque ne peut pas fuiter par oubli.
 */
export function toWallMission(source: WallMissionSource): WallMission {
  return {
    id: source.id,
    title: source.title,
    kindLabel: source.actionKindLabel,
    market: `${source.marketName} (${source.marketCode})`,
    createdAt: source.createdAt,
  };
}

// ── Compétences (saisie libre normalisée — pas de taxonomie inventée) ──

export const MAX_SKILLS = 12;

/**
 * Normalise la saisie des compétences (une par ligne ou séparées par des
 * virgules) : trim, vides retirés, doublons (insensibles à la casse) retirés,
 * bornées à MAX_SKILLS. Déterministe — l'ordre de saisie est conservé.
 */
export function normalizeSkills(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,]/)) {
    const skill = part.trim().replace(/\s+/g, " ");
    if (!skill) continue;
    const key = skill.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}
