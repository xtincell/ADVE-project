import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "heading",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root"],
  variants: [
    { name: "h1" }, { name: "h2" }, { name: "h3" }, { name: "h4" }, { name: "h5" }, { name: "h6" },
    { name: "display" }, { name: "mega" },
  ],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Hiérarchie sémantique (h1-h6) + 2 scales hero (display/mega). Fluid type via clamp() élimine 245 instances text-[Npx] arbitraires legacy. text-balance pour titres ≤6 lignes.",
});
