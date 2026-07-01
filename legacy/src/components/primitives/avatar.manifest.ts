import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "avatar",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "image", "fallback"],
  variants: [{ name: "default" }],
  sizes: ["xs", "sm", "md", "lg", "xl"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Identité visuelle utilisateur — topbar (user menu), Creator profile, message thread. Fallback initiales si pas d'image.",
});
