import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "grid",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root"],
  variants: [{ name: "default" }, { name: "responsive" }],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Layout primitive — cards grid, KPI grid, bento. Responsive par défaut (collapse 1col mobile → 2col tablet → ncol desktop).",
});
