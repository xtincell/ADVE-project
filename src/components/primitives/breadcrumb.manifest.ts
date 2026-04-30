import { defineComponentManifest } from "@/lib/design/define-component-manifest";

export const manifest = defineComponentManifest({
  component: "breadcrumb",
  governor: "NETERU_UI",
  version: "1.0.0",
  anatomy: ["root", "item", "separator"],
  variants: [{ name: "default" }],
  a11yLevel: "AA",
  i18n: { rtl: true, fontScaling: "200%" },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Topbar breadcrumb existing — utilise label aria-label='Fil d'Ariane' + aria-current='page'. Logical separator orientation pour RTL.",
});
