import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "tooltip",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["trigger", "content", "arrow"],
  variants: [{ name: "top" }, { name: "bottom" }, { name: "left" }, { name: "right" }],
  states: ["closed", "opening", "open"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Hint courte (≤80 char) sur hover/focus — Topbar buttons icon-only, ellipsis text révèle full, helper Cmd+K. role=tooltip + aria-describedby + ESC close.",
});
