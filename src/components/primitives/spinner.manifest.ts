import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "spinner",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "sr-label"],
  variants: [{ name: "default" }],
  sizes: ["sm", "md", "lg", "xl"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Loading indicator — Mestor stream, intent execution, Glory tool runs. role=status + sr-only label pour SR. animate-spin neutralisé par prefers-reduced-motion.",
});
