import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "accordion",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "item", "trigger", "content", "icon"],
  variants: [{ name: "single" }, { name: "multiple" }],
  states: ["closed", "open"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "FAQ landing (6 items), settings sections, Oracle deliverables drill-down. Native <details>/<summary> = aria-expanded auto + keyboard ⏎/Space.",
});
