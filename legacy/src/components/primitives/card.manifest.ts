import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "card",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "header", "title", "description", "body", "footer", "actions"],
  variants: [
    { name: "flat", tokens: [] },
    { name: "raised", tokens: ["card-bg", "card-border"] },
    { name: "elevated", tokens: ["card-bg-elevated", "card-shadow"] },
    { name: "overlay", tokens: ["card-bg-overlay", "card-shadow-hover"] },
    { name: "outlined", tokens: ["card-border-hover"] },
  ],
  density: ["compact", "comfortable", "airy", "editorial"],
  states: ["default", "hover", "focus"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Cards porteuses de tous les contenus — manifests, missions, KPIs, briefs. Density commande l'expérience opérateur (Console compact vs Cockpit comfortable vs Landing editorial).",
});
