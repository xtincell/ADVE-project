import type { Metadata } from "next";
import { ThemeViewScreen } from "../theme-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Proposition" };

/**
 * Proposition — port de l'esprit de `legacy/(cockpit)/cockpit/brand/proposition`
 * en vue éditoriale : la chaîne de promesses de la marque (conviction A →
 * promesse D/V/E → preuves), lue depuis les champs réels des piliers.
 * La compilation du document stratégique, elle, vit dans /app/oracle.
 */
export default function PropositionPage() {
  return <ThemeViewScreen viewId="proposition" />;
}
