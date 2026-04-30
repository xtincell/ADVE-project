import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "container",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root"],
  variants: [{ name: "prose" }, { name: "content" }, { name: "full" }],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Wrapper page max-width + padding fluid. Cible : remplacer wrap class custom répété sur chaque page (--maxw-content, --pad-page).",
});
