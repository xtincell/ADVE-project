import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "select",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "trigger", "icon-chevron"],
  variants: [
    { name: "default" },
    { name: "invalid" },
    { name: "valid" },
  ],
  sizes: ["sm", "md", "lg"],
  states: ["default", "hover", "focus", "filled", "invalid", "valid", "disabled"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Sélection sémantique — filtres tableaux (Console intents/clients), pillar/state selectors (Cockpit), tier choice (Creator). Native `<select>` pour a11y maximum.",
});
