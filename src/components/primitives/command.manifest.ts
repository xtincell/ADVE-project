import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "command",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "input", "list", "item", "hint"],
  variants: [{ name: "default" }],
  states: ["closed", "open", "active-item"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Cmd+K palette — navigation rapide cross-portail. role=combobox + listbox + aria-activedescendant. Keyboard ↑↓ + Enter + ESC.",
});
