import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "field",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "label", "input", "helper", "error"],
  variants: [
    { name: "default" },
    { name: "invalid" },
  ],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Compound wrapper Label+Input+Helper+Error. Couplage aria-describedby + role=alert pour validation messages screen-reader friendly.",
});
