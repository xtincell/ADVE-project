import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "textarea",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root"],
  variants: [
    { name: "default" },
    { name: "invalid" },
    { name: "valid" },
  ],
  states: ["default", "hover", "focus", "filled", "invalid", "valid", "disabled", "readonly"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Saisie libre — manifests editor (Cockpit pillar-page 28KB), Mestor chat composer, brief composer. Resize-y + min-height pour copy long.",
});
