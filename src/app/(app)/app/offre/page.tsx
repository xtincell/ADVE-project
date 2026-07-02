import type { Metadata } from "next";
import { ThemeViewScreen } from "../theme-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Offre & pricing" };

/**
 * Offre & pricing — port de `legacy/(cockpit)/cockpit/brand/offer` en vue
 * éditoriale : catalogue, modèle économique et bénéfice client, lus depuis
 * les champs réels du pilier V (+ cibles A/D). Mapping `domain/pillar-views`.
 */
export default function OffrePage() {
  return <ThemeViewScreen viewId="offre" />;
}
