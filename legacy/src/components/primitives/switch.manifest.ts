import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "switch",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "track", "thumb"],
  variants: [{ name: "standard" }],
  sizes: ["sm", "md"],
  states: ["default", "checked", "disabled", "focus"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Toggle boolean — settings, theme switch (futur), feature flags Console. Native checkbox sous-jacent pour aria-checked.",
});
