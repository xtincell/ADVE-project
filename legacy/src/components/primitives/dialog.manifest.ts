import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "dialog",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["overlay", "content", "header", "title", "description", "body", "footer", "close"],
  variants: [
    { name: "alert", description: "Information bloquante, 1 CTA" },
    { name: "confirm", description: "Action destructive (delete, cancel)" },
    { name: "form", description: "Édition rapide modale" },
    { name: "wide", description: "Lecture (PDF preview, Oracle section)" },
    { name: "fullscreen", description: "Mobile primarily, ou édition longue desktop" },
  ],
  sizes: ["sm", "md", "lg", "xl", "fullscreen"],
  states: ["closed", "opening", "open", "closing"],
  constraints: { maxLines: 0 },
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Modales requises sur tous portails — confirm intent compensate (Console), edit manifest (Cockpit), preview PDF (Oracle). Focus trap + ESC + return focus = WCAG AA non négociable.",
});
