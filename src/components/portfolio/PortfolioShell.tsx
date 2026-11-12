"use client";

import { Building2, Layers3 } from "lucide-react";
import { AppShell, type NavGroup } from "@/components/navigation";
import { trpc } from "@/lib/trpc/client";
import { CockpitThemeToggle } from "@/components/cockpit/theme-toggle";
import { usePortfolioOperator } from "./use-portfolio-operator";

/** The portfolio spans strategies; its navigation must not target a stale brand. */
export function PortfolioShell({ children }: { children: React.ReactNode }) {
  const { operator } = usePortfolioOperator();
  const roots = trpc.brandNode.listRoots.useQuery({ operatorId: operator?.id ?? "" }, { enabled: Boolean(operator) });
  const query = operator ? `?operator=${encodeURIComponent(operator.id)}` : "";
  const groups: NavGroup[] = [
    { title: "", items: [{ label: "Toutes les marques", href: `/cockpit/portfolio${query}`, icon: Layers3, mobileTab: true }] },
    { title: "Marques et groupes", items: (roots.data ?? []).map((node) => ({ label: node.name, href: `/cockpit/portfolio/${node.slug}${query}`, icon: Building2, mobileTab: true })) },
  ];
  return <AppShell portal="cockpit" navGroups={groups} portalAccentVar="var(--color-portal-cockpit)" assistantEnabled={false}
    sidebarHeader={<div className="flex items-start justify-between gap-2"><div><p className="font-display text-lg">Portefeuille</p><p className="mt-1 text-xs text-foreground-secondary">{operator?.name ?? "Marques et produits"}</p></div><CockpitThemeToggle /></div>}>
    {children}
  </AppShell>;
}
