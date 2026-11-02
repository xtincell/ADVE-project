import { FIELD_PROVENANCE_LABEL, fieldStatusFor, isFieldProvenance } from "@/domain/field-provenance";
import { wrapUntrusted } from "./untrusted-content";
import { BRAND_ACTOR_CONTEXT_NOTICE } from "@/domain/brand-actors";

/** Shorten prose leaves; retain every record, identifier and numeric value. */
export function projectForContext(value: unknown, leafMax: number): unknown {
  if (typeof value === "string") return value.length > leafMax ? value.slice(0, leafMax) + "…" : value;
  if (Array.isArray(value)) return value.map(v => projectForContext(v, leafMax));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, projectForContext(v, leafMax)]));
  }
  return value;
}

/** The same bounded, authority-qualified context for individual and sequenced readers. */
export function serializePillar(key: string, content: unknown, fieldStatus?: (field: string) => string | undefined): string {
  if (!content || typeof content !== "object") return `[${key}] Vide`;
  const projected = projectForContext(content, 400);
  const status = fieldStatus ?? fieldStatusFor(undefined, key, (content as Record<string, unknown>)._fieldProvenance);
  const qualified = projected && !Array.isArray(projected)
    ? Object.fromEntries(Object.entries(projected as Record<string, unknown>)
      .filter(([field]) => !field.startsWith("_"))
      .map(([field, valeur]) => {
        const statut = status(field) ?? "UNKNOWN";
        return [field, { statut, origine: isFieldProvenance(statut) ? FIELD_PROVENANCE_LABEL[statut]
          : "Qualification héritée — provenance de champ non établie", valeur }];
      }))
    : projected;
  const json = JSON.stringify(qualified, null, 2);
  // Never hand a reader half a JSON object or silently discard its last personas.
  // The former 8K/1.1K summaries also removed all nested foreign-key targets.
  // A complete I catalogue is larger than the former 64K per-pillar guard.
  // Keep admission bounded and lossless at the record level; model-window
  // compression, routing and cost remain the existing gateway's responsibility.
  const max = 128_000;
  if (json.length > max) throw new Error(`PILLAR_CONTEXT_TOO_LARGE: ${key} dépasse la fenêtre structurée (${json.length}/${max}).`);
  const notice = ["D", "V"].includes(key.toUpperCase()) ? `${BRAND_ACTOR_CONTEXT_NOTICE}\n` : "";
  return notice + wrapUntrusted(`PILIER ${key}`, json, { max });
}

/** A rich corpus grounds ADVE; missing facts are not a completion quota. */
export const ADVE_SOURCE_ALIGNMENT_CONTRACT = `Les documents courants et les desiderata attribués alimentent un ADVE qualifié, dont R/T/I/S sont dérivés. Si une information nécessaire n’est pas déductible de l’ADVE, identifier le champ A/D/V/E à réconcilier par le parcours de proposition/amendement existant, puis recalculer ses dépendances. Ne pas créer de prémisse concurrente dans I/S.
Respecter les décisions humaines existantes et la qualification de chaque source. Un document PROPOSED, un postulat, une piste ou un souhait de stakeholder reste une proposition à valider ; un document REFERENCE ne vaut ni adoption ni exécution. Les désiderata conservent auteur, date, périmètre et statut. Ne pas mélanger les informations privées ou d’autres projets contenues dans une pièce composite.
Une donnée initiale ou historique sans preuve actuelle n’est pas une validation. Distinguer observation mesurée, objectif déclaré et hypothèse proposée. Pour un indicateur, séparer définition, cible, unité, fenêtre d’observation et cadence de suivi. Une fenêtre de 14 jours n’impose pas une fréquence de suivi ; un objectif à M12 n’est pas un résultat atteint ou une date de lancement.
Reprendre les informations disponibles avec leurs sources et leurs limites, sans inventer chiffre, cible, date, personne ou cadence pour satisfaire une forme ou un minimum. Si une cible ou fréquence n’est pas établie, conserver null lorsque le schéma le permet et expliquer la lacune dans la justification ; sinon ne pas proposer de valeur fabriquée. Une déduction ou cadence suggérée reste explicitement une proposition, jamais une décision humaine. Aucun quota de recommandations ou de champs ne justifie une invention.`;

/** Shared source contract for the existing I generators. No provider or call
 * orchestration: source versions, campaign purpose, cadence and cost unit are
 * distinct and optional when the actual evidence is absent. */
export const INITIATIVE_PLANNING_SOURCE_CONTRACT = `${ADVE_SOURCE_ALIGNMENT_CONTRACT}
Les piliers ADVE qualifiés constituent le socle de R/T/I/S. Déduire les actions depuis ce socle et les analyses R/T ; les documents courants contrôlent leur alignement et leur traçabilité, ils ne constituent pas un socle parallèle pour masquer un manque ADVE.
INVARIANT : si une information nécessaire ne peut pas être déduite de l’ADVE, c’est l’ADVE qui doit être mis à jour. Identifier le champ A/D/V/E concerné, les sources ou inputs attribués qui peuvent le compléter et le parcours de proposition/amendement existant ; ne pas demander de ressaisir cette lacune dans I ou S, ni la masquer par un fallback. Conserver le travail existant pendant la réconciliation, puis recalculer les étapes dépendantes.
Si un document apporte ou contredit une information fondamentale sur la marque, signaler l’écart et proposer sa réconciliation dans A/D/V/E par le parcours gouverné avant d’en faire une prémisse stratégique. Un desideratum de stakeholder est un souhait ou une contrainte proposée, identifié par son auteur, sa date, son périmètre et son statut ; il ne devient ni décision adoptée ni observation marché par simple présence dans un fichier. Ne pas mélanger les informations privées ou d’autres projets contenues dans un document composite.
Pour chaque action, conserver les informations de planification alignées sur ce socle et les documents courants :
- campaignCanonType facultatif : GTM_90 (lancement/traction), ANNUAL (programme annuel), ALWAYS_ON (boucle permanente), PUNCTUAL (activation ponctuelle).
- cadence facultative : ONE_SHOT, DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY ou ROLLING. Une série hebdomadaire peut appartenir à un lancement borné ; un horizon long ne signifie pas permanent.
- timeframe facultatif : SPRINT_90, PHASE_1, PHASE_2 ou LONG_TERM. Un ancien calendrier archivé ne fixe pas le calendrier courant.
- budgetRange facultatif : {min: nombre, max: nombre}, bornes issues du document ou d’un chiffrage de référence effectivement fourni ; conserver la fourchette sans choisir un milieu. Ne pas transformer un tarif unitaire en enveloppe totale.
- budgetPeriod facultatif : ONE_OFF, PER_OCCURRENCE, MONTHLY, QUARTERLY, YEARLY ou UNSPECIFIED. La périodicité du coût est distincte de la cadence de campagne ; une mise en place ponctuelle et une diffusion mensuelle sont des responsabilités séparées.
Ne pas inventer de fourchette, de date, de devis, de responsable ni de fréquence pour remplir un champ. Les hypothèses restent des propositions, jamais des mesures ou décisions. Si l’information existe dans le contexte documentaire courant, la reprendre au lieu de l’omettre. Si elle manque réellement, omettre le champ et rendre cette limite explicite. Conserver les identifiants des actions existantes quand l’action est inchangée ; ne pas générer de préférence humaine.`;
