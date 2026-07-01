import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "stack",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root"],
  variants: [{ name: "row" }, { name: "col" }],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Layout primitive (flex direction × gap × align × justify). Évite la réécriture de classes flex inline partout. Gap consomme spacing tokens.",
});
