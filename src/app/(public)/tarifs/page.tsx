import { permanentRedirect } from "next/navigation";

/**
 * /tarifs — les tarifs sont ceux du PRODUIT : la page vit dans l'univers
 * La Fusée (/lafusee/tarifs, alias lafusee.<racine>/tarifs). Redirect 308
 * permanent (WP-025) — sur l'hôte produit, le middleware réécrit /tarifs
 * avant même d'atteindre cette route ; ce redirect couvre les autres hôtes
 * et les liens historiques.
 */
export default function TarifsPage(): never {
  permanentRedirect("/lafusee/tarifs");
}
