import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "popover",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["trigger", "content"],
  variants: [{ name: "top" }, { name: "bottom" }, { name: "left" }, { name: "right" }],
  states: ["closed", "open"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Mini-form / picker / token detail — date picker, color picker, design-system token preview. role=dialog + aria-expanded + click-outside + ESC close.",
});
