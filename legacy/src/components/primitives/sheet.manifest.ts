import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "sheet",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["overlay", "content", "header", "body", "footer"],
  variants: [{ name: "right" }, { name: "left" }, { name: "top" }, { name: "bottom" }],
  sizes: ["sm", "md", "lg"],
  states: ["closed", "open"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Drawer latéral / mobile More menu / détail item édition longue. role=dialog + aria-modal + ESC + scroll lock. Sheet bottom = mobile-friendly (More tab bar).",
});
