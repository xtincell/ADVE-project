import { defineComponentManifest } from "@/lib/design/define-component-manifest";

/**
 * Phase 23 Epic 7 Story 7.1 — manifest reflects the ConnectorResult-driven
 * props + the `instance` CVA variant. The radar is the founder's Overton
 * instrument (MISSION drift 5) — its mission contribution is DIRECT_OVERTON.
 */
export const manifest = defineComponentManifest({
  component: "overton-radar",
  governor: "NETERU_UI",
  version: "2.0.0",
  anatomy: ["root", "header", "radar-svg", "evidence-feed", "metric-cell", "honest-state"],
  variants: [
    { name: "full", tokens: ["color-border", "color-foreground", "color-accent"], description: "A2 Split — radar left, dated evidence feed right (UX-DR19)." },
    { name: "teaser", tokens: ["color-border", "color-foreground"], description: "Compact dashboard bento — radar shrinks, top evidence becomes headline." },
  ],
  density: ["comfortable", "compact"],
  states: ["LIVE", "DEFERRED_AWAITING_CREDENTIALS", "DEGRADED", "PER_AXIS_PARTIAL"],
  constraints: { minHeight: "220px" },
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "DIRECT_OVERTON",
  missionStep: 5,
});
