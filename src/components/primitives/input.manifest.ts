import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "input",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "icon-leading", "field", "icon-trailing"],
  variants: [
    { name: "default", tokens: ["input-bg", "input-border", "input-fg"] },
    { name: "invalid", tokens: ["input-border-invalid"] },
    { name: "valid", tokens: ["input-border-valid"] },
  ],
  sizes: ["sm", "md", "lg"],
  states: ["default", "hover", "focus", "filled", "invalid", "valid", "disabled", "readonly"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Saisie utilisateur transversale — auth, intake (10+ étapes), brief composer, Mestor chat. Sans Input cohérent, validation states fragmentée.",
});
