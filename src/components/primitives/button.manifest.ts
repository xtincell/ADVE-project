import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "button",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "icon-leading", "label", "icon-trailing"],
  variants: [
    { name: "primary", tokens: ["button-primary-bg", "button-primary-fg"], description: "CTA principal — accent rouge fusée" },
    { name: "ghost", tokens: ["button-ghost-border", "button-ghost-fg"], description: "Bordure seule, fond transparent" },
    { name: "outline", tokens: ["button-outline-border", "button-outline-fg"], description: "Outline strong" },
    { name: "subtle", tokens: ["button-subtle-bg", "button-subtle-fg"], description: "Surface raised, action secondaire" },
    { name: "destructive", tokens: ["button-destructive-bg", "button-destructive-fg"], description: "Action destructive (delete, cancel)" },
    { name: "link", tokens: ["button-link-fg"], description: "Apparence lien" },
  ],
  sizes: ["sm", "md", "lg", "icon"],
  states: ["default", "hover", "active", "focus", "disabled", "loading"],
  constraints: { touchTargetMin: "44x44 (size=lg)" },
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Primitive transversale consommée par tous les portails — impossible d'industrialiser missions/forges sans un Button cohérent.",
});
