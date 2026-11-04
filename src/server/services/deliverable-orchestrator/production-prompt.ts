import type { ProductionSourceManifest } from "@/domain/production-sources";
import { wrapUntrusted } from "@/server/services/utils/untrusted-content";

/** Input persisted on INVOKE_GLORY_TOOL and rendered verbatim as fenced source data in
 * the user prompt. Separate from template substitution; no placeholder or "$&" expansion. */
export function productionSourceInput(manifest: ProductionSourceManifest): string {
  if (!manifest.calendarBrief && !manifest.creativeProposal && !manifest.sources.length) return "";
  const labels = { ART_DIRECTION: "Direction artistique retenue", COPY: "Copie retenue (exacte)", REFERENCE: "Inspiration seulement", MATERIAL: "Élément destiné au montage" };
  const parts: string[] = [];
  if(manifest.productionArtwork)parts.push(manifest.productionArtwork.photoPolicy==="LOCKED_MASTER" ? "Ce montage conserve le master intégral. Ne propose aucune nouvelle photographie." : "Le master contient déjà les textes, le logo, les formes, la mise en page et les couleurs. Le champ prompt de Glory doit décrire uniquement l’illustration photographique à insérer : sujets attestés, cadrage et lumière de cette piste. La légende et la DA servent à choisir la scène ; aucune consigne pour dessiner titres, lettres, tickets, cadres ou logo dans la photographie.");
  if (manifest.calendarBrief) parts.push(wrapUntrusted("BRIEF DU POST · ligne, variante et direction figées",manifest.calendarBrief.text,{max:32000}));
  if (manifest.creativeProposal) parts.push(wrapUntrusted("PROPOSITION CRÉATIVE VALIDÉE", JSON.stringify(manifest.creativeProposal), {max:32000}));
  for (const s of manifest.sources) {
    parts.push(wrapUntrusted(labels[s.role], JSON.stringify({actif: s.name, id: s.assetId, version: s.version,
      empreinte: s.fingerprint, texte: s.text, transmission: s.transport === "ARTWORK_MASTER" ? "Master SVG verrouillé : logo, copie, polices et composition conservés ; seule la photo désignée est composable." : s.transport === "TEXT" ? "Texte uniquement" : s.transport==="IMAGE_REFERENCE" ? "Image réservée au moteur visuel ; aucun pixel reçu par le rédacteur" : "Identité seulement ; aucun pixel transmis"}),
    {max:32000}));
  }
  return parts.join("\n\n");
}
export const PRODUCTION_SOURCE_RULE = "Le brief du post donne la ligne, la piste et la correction demandée. Respecte-les et sa direction artistique versionnée. Une date projetée n’est pas une approbation. La proposition créative validée cadre cette production. Suis la direction artistique retenue et conserve les mots de la copie retenue. Distingue légende, CTA et texte à inscrire sur le visuel selon la copie ; ne déplace pas par défaut la légende sur l’image. Les références d’inspiration ne sont pas des éléments à reproduire ou à incorporer. Ne prétends pas avoir vu une image si seule son identité est transmise.";
