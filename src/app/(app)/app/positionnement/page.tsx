import type { Metadata } from "next";
import { ThemeViewScreen } from "../theme-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Positionnement" };

/**
 * Positionnement — port de `legacy/(cockpit)/cockpit/brand/positioning` en
 * vue éditoriale : regroupe les champs réels des piliers A et D qui répondent
 * à « comment la marque se distingue » (mapping `domain/pillar-views`).
 */
export default function PositionnementPage() {
  return <ThemeViewScreen viewId="positionnement" />;
}
