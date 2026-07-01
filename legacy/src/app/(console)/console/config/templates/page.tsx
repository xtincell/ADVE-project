"use client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Layout, FileText, Palette, FileBarChart, BookOpen } from "lucide-react";

const TEMPLATE_CATEGORIES = [
  { label: "Briefs creatifs", desc: "Templates de briefs pour missions et campagnes", icon: FileText, count: 0 },
  { label: "Guidelines", desc: "Templates de guidelines de marque (visuelles, tonales)", icon: Palette, count: 0 },
  { label: "Value Reports", desc: "Templates de rapports de valeur (J+7, J+14, J+30)", icon: FileBarChart, count: 0 },
  { label: "Playbooks", desc: "Templates de playbooks strategiques par secteur", icon: BookOpen, count: 0 },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Templates" description="Gestion des templates de briefs, guidelines, value reports et playbooks" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Config", href: "/console/config" }, { label: "Templates" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <div key={cat.label} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-subtle p-2"><cat.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{cat.label}</h3>
                <p className="text-xs text-foreground-muted">{cat.desc}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-foreground-muted">{cat.count} template(s)</p>
          </div>
        ))}
      </div>

      <EmptyState icon={Layout} title="Templates a venir" description="Le systeme de templates sera enrichi progressivement. Les templates AI seront generees depuis les guidelines de marque." />
    </div>
  );
}
