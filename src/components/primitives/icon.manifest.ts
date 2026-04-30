import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "icon",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root"],
  variants: [{ name: "default" }],
  sizes: ["xs", "sm", "md", "lg", "xl"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Wrapper unifié autour de lucide-react — sizing en tokens, mirror RTL automatique (chevrons, arrows, send), aria-hidden par défaut sauf si label fourni. ESLint rule `lafusee/no-direct-lucide-import` (PR-9) force l'usage.",
});
