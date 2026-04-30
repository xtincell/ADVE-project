import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "progress",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["track", "fill"],
  variants: [
    { name: "determinate" },
    { name: "indeterminate" },
  ],
  sizes: ["sm", "md", "lg"],
  tones: ["accent", "success", "warning", "error"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Progress visible — pillar completion (Cockpit), upload progress (Ptah), pipeline progress (Console), score reveal (Intake). aria-valuenow/min/max + role=progressbar.",
});
