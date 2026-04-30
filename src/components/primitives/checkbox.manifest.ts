import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "checkbox",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "indicator-checked", "indicator-indeterminate"],
  variants: [
    { name: "default" },
    { name: "indeterminate", description: "Bulk select partiel" },
  ],
  states: ["default", "checked", "indeterminate", "disabled", "focus"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Sélection multiple — filtres bulk (Console clients), feature matrix pricing, asset library bulk select. Native input pour aria-checked auto.",
});
