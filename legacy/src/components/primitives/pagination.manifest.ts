import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "pagination",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "previous", "current", "next"],
  variants: [{ name: "default" }],
  sizes: ["sm", "md"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "DataTable Console (50-1000 rows). Logical chevrons mirror RTL.",
});
