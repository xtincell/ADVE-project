import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "banner",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "icon", "message", "actions", "dismiss"],
  variants: [{ name: "neutral" }, { name: "accent" }, { name: "warning" }, { name: "error" }],
  tones: ["neutral", "accent", "warning", "error"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Information page-level (top of page). Distinct d'Alert qui est inline. Cookie consent, freeze warning, Phase status banner.",
});
