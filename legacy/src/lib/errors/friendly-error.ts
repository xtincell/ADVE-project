/**
 * Friendly error interpreter (client) — M11/M13.
 *
 * Transforme n'importe quelle erreur (TRPCError avec `cause.code` du catalogue
 * ORACLE-NNN, dump ZodError brut, signature gouvernance / Prisma) en une erreur
 * LISIBLE, CODÉE et COLORÉE :
 *   - `code`        : identifiant par type (VAL-* / GOV-* / DB-* / NET-* / ORACLE-*)
 *     → facilite le fix et les rapports (système existant ORACLE-NNN étendu).
 *   - `tone`        : "error" (bloquant, rouge) | "warning" (non-bloquant, jaune).
 *   - `title`       : ce que c'est, en FR (langue active du portail).
 *   - `detail`      : à quoi ça correspond / quel champ.
 *   - `implication` : ce que ça implique pour l'utilisateur (que faire).
 *
 * Pur, sans dépendance UI. Rendu par <FriendlyError> (friendly-error.tsx).
 */

export type ErrorTone = "error" | "warning";

export interface FriendlyError {
  code: string;
  tone: ErrorTone;
  title: string;
  detail?: string;
  implication?: string;
}

// Libellés FR des champs (briefs Guilde + profils + marque) pour les messages Zod.
const FIELD_LABELS: Record<string, string> = {
  title: "Titre", category: "Catégorie", sector: "Secteur", location: "Localisation",
  summary: "Accroche", context: "Contexte", targetAudience: "Cible",
  deliverables: "Livrables", channels: "Canaux", skillsRequired: "Compétences recherchées",
  qualityCriteria: "Critères de qualité", constraints: "Contraintes", references: "Références",
  brandName: "Nom de la marque", brandWebsite: "Site web", budgetAmount: "Budget",
  contactName: "Contact", contactEmail: "Email de contact", deadline: "Échéance",
  displayName: "Nom d'affichage", bio: "Bio", skills: "Compétences", payoutPhone: "Mobile money",
  orgName: "Nom de l'organisation", email: "Email", password: "Mot de passe", name: "Nom",
};

interface ZodIssue { code?: string; path?: (string | number)[]; minimum?: number; message?: string; type?: string; origin?: string }

function fieldLabel(path: (string | number)[] | undefined): string {
  const seg = path?.find((p) => typeof p === "string") as string | undefined;
  return seg ? (FIELD_LABELS[seg] ?? seg) : "Champ";
}

function zodIssueToText(it: ZodIssue): string {
  const label = fieldLabel(it.path);
  switch (it.code) {
    case "too_small":
      return it.type === "array" || it.origin === "array"
        ? `${label} : ajoutez au moins ${it.minimum ?? 1} élément${(it.minimum ?? 1) > 1 ? "s" : ""}.`
        : `${label} : trop court (minimum ${it.minimum ?? 1}).`;
    case "too_big":
      return `${label} : trop long.`;
    case "invalid_type":
      return `${label} : requis.`;
    case "invalid_string":
    case "invalid_format":
      return `${label} : format invalide.`;
    default:
      return `${label} : ${it.message ?? "valeur invalide"}.`;
  }
}

/** Tente de parser un dump ZodError (issues sérialisées dans le message). */
function tryParseZodIssues(raw: string): ZodIssue[] | null {
  const s = raw.trim();
  if (!s.startsWith("[") && !s.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(s);
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.issues) ? parsed.issues : null;
    if (arr && arr.length && typeof arr[0] === "object") return arr as ZodIssue[];
  } catch { /* not JSON */ }
  return null;
}

/** Forme tRPC : err.data.cause / err.data.zodError / err.message. */
interface TrpcLikeError {
  message?: string;
  data?: {
    code?: string;
    cause?: { code?: string; governor?: string; remediation?: string };
    zodError?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
  };
}

export function interpretError(err: unknown, codeCatalogue?: Record<string, { fr: string; hint: string }>): FriendlyError {
  const e = (err ?? {}) as TrpcLikeError;
  const message = typeof e.message === "string" ? e.message : String(err ?? "");

  // 1. Code gouverné explicite (ORACLE-NNN…) via cause
  const causeCode = e.data?.cause?.code;
  if (causeCode) {
    const entry = codeCatalogue?.[causeCode];
    return {
      code: causeCode,
      tone: "error",
      title: entry?.fr ?? message.replace(/^\[[A-Z]+-\d+\]\s*/, ""),
      detail: e.data?.cause?.governor ? `Domaine : ${e.data.cause.governor}` : undefined,
      implication: e.data?.cause?.remediation ?? entry?.hint,
    };
  }

  // 2. Validation Zod (data.zodError ou dump dans le message)
  const fe = e.data?.zodError?.fieldErrors;
  if (fe && Object.keys(fe).length > 0) {
    const parts = Object.entries(fe).map(([k, msgs]) => `${FIELD_LABELS[k] ?? k} : ${msgs?.[0] ?? "invalide"}`);
    return { code: "VAL-001", tone: "error", title: "Formulaire incomplet", detail: parts.join(" · "), implication: "Corrigez les champs signalés puis renvoyez." };
  }
  const issues = tryParseZodIssues(message);
  if (issues) {
    return { code: "VAL-001", tone: "error", title: "Formulaire incomplet", detail: issues.map(zodIssueToText).join(" · "), implication: "Corrigez les champs signalés puis renvoyez." };
  }

  // 3. Gouvernance — operator binding
  if (/operator binding/i.test(message)) {
    return { code: "GOV-401", tone: "error", title: "Action non rattachée à un opérateur.", detail: "Le système n'a pas pu relier votre compte à un émetteur d'Intent.", implication: "Reconnectez-vous ; si le problème persiste, signalez le code GOV-401." };
  }

  // 4. Base de données — migration en attente (colonne manquante)
  const colMatch = message.match(/column `?(\w+)`? .*does not exist/i);
  if (colMatch) {
    return { code: "DB-503", tone: "error", title: "Mise à jour de la base requise.", detail: `Le champ « ${FIELD_LABELS[colMatch[1]!] ?? colMatch[1]} » n'existe pas encore en base (migration en attente).`, implication: "Réessayez après le prochain déploiement, ou signalez le code DB-503." };
  }

  // 5. Accès / auth
  if (e.data?.code === "FORBIDDEN" || /forbidden|unauthorized|réservé/i.test(message)) {
    return { code: "GOV-403", tone: "error", title: "Action réservée.", detail: message.slice(0, 200), implication: "Vérifiez vos droits ou connectez-vous avec le bon rôle." };
  }

  // 6. Fallback générique
  return { code: "NET-500", tone: "error", title: "Une erreur est survenue.", detail: message.slice(0, 200) || undefined, implication: "Réessayez ; si ça persiste, signalez le code NET-500." };
}

/** Construit une FriendlyError jaune (non-bloquante) depuis un warning serveur. */
export function warningToFriendly(text: string, code = "WARN-001"): FriendlyError {
  return { code, tone: "warning", title: text, implication: "Non bloquant — vous pouvez continuer." };
}
