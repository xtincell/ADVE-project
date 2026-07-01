import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "label",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "text", "required-mark", "optional-mark"],
  variants: [
    { name: "required" },
    { name: "optional" },
    { name: "default" },
  ],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Couplage label↔field WCAG obligatoire. Marker requis = rouge accent (cohérent panda).",
});
