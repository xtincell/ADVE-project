import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "stepper",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "step", "indicator", "label", "description", "connector"],
  variants: [{ name: "horizontal" }, { name: "vertical" }],
  states: ["pending", "current", "done", "error"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "DIRECT_BOTH",
  missionStep: 1,
});
