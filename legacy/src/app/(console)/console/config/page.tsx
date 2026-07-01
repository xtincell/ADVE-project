"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Settings, Sliders, Layout, Plug } from "lucide-react";
import Link from "next/link";

export default function ConfigPage() {
  const sections = [
    { href: "/console/config/thresholds", label: "Seuils & Alertes", desc: "Seuils ADVE, promotion guilde, commissions, SLA", icon: Sliders },
    { href: "/console/config/templates", label: "Templates", desc: "Briefs, guidelines, value reports, playbooks", icon: Layout },
    { href: "/console/config/integrations", label: "Integrations", desc: "Connexions sociales, media, webhooks", icon: Plug },
    { href: "/console/config/system", label: "Systeme", desc: "MCP keys, pricing marche, parametres globaux", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Configuration" description="Parametres globaux, seuils, templates et integrations" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Configuration" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl border border-border bg-card p-6 transition-all hover:bg-card-hover hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-subtle p-2"><s.icon className="h-5 w-5 text-primary" /></div>
              <div><h3 className="text-sm font-semibold text-foreground">{s.label}</h3><p className="text-xs text-foreground-muted">{s.desc}</p></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
