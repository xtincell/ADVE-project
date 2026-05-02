import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "text",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root"],
  variants: [
    { name: "body" }, { name: "lead" }, { name: "caption" }, { name: "label" }, { name: "mono" },
  ],
  tones: ["default", "muted", "accent", "success", "warning", "error"],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Body / caption / label / mono / lead. Cible : éliminer 818 occurrences text-foreground-muted + 572 text-foreground-secondary par tone=muted, tone=secondary. lead utilise text-pretty pour max-w-60ch.",
});
