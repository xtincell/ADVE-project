import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "skeleton",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root"],
  variants: [
    { name: "rect" },
    { name: "circle" },
    { name: "text" },
  ],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Loading placeholder pendant data fetch — DataTable rows, asset gallery, manifest editor. animate-pulse neutralisé par prefers-reduced-motion. aria-busy + aria-label pour SR.",
});
