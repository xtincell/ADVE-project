import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "badge",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "icon", "label"],
  variants: [
    { name: "soft", tokens: ["badge-bg-*", "badge-fg-*"] },
    { name: "solid", tokens: ["badge-bg-*"] },
    { name: "outline", tokens: ["color-foreground"] },
  ],
  tones: ["neutral", "accent", "success", "warning", "error", "info"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Tier badges (4 Creator), Classification badges (6 APOGEE), Pillar badges (8 ADVE), Status badges (6 intent states) reposent dessus. Variants tone × variant × outline couvrent les ~24 cas badge du repo.",
});
