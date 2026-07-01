import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "separator",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root"],
  variants: [{ name: "horizontal" }, { name: "vertical" }],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Diviseur sémantique — sidebar groups, card sections, topbar items. role=presentation par défaut (decorative), sinon role=separator + aria-orientation.",
});
