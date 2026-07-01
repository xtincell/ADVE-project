import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "toast",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "icon", "title", "body", "actions", "dismiss"],
  variants: [
    { name: "neutral" },
    { name: "success" },
    { name: "warning" },
    { name: "error" },
    { name: "info" },
  ],
  tones: ["neutral", "success", "warning", "error", "info"],
  states: ["entering", "visible", "exiting"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Notification éphémère — action success, error vault auto-resolve, intent compensate confirm. role=alert+aria-live=assertive (error) ou polite. Stack management hors primitive (provider externe).",
});
