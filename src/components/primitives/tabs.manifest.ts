import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "tabs",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "list", "trigger", "content"],
  variants: [{ name: "horizontal" }, { name: "vertical" }],
  states: ["default", "active", "hover", "focus"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Compound component — Cockpit pillar pages (5 phases), Console division pages, Gouverneurs landing (5 tabs M/A/S/T/Ptah), filter tabs Creator missions. role=tablist + tab + tabpanel + aria-selected.",
});
