import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "alert",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "icon", "title", "body", "actions"],
  variants: [{ name: "info" }, { name: "success" }, { name: "warning" }, { name: "error" }],
  tones: ["info", "success", "warning", "error"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Inline message contextuel — error vault notification, success post-action, warning before destructive. role=alert (error) ou role=status (info/success/warning).",
});
