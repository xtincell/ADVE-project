import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "radio",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "indicator"],
  variants: [
    { name: "standard", description: "Radio classique vertical" },
  ],
  states: ["default", "checked", "disabled", "focus"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Sélection exclusive — intake method choice (4 cards GUIDED/IMPORT/INGEST/INGEST_PLUS), pricing period switch, density chooser DS preview.",
});
