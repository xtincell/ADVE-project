import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "tag",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "label", "dismiss"],
  variants: [{ name: "static" }, { name: "dismissible" }],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Mots-clés / filtres actifs — Creator profile skills, mission tags, search filter chips. Distinct des Badges (qui sont sémantiques tone-based).",
});
