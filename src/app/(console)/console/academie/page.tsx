"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  ArrowRight,
} from "lucide-react";

const SECTIONS = [
  {
    title: "Cours",
    description: "Catalogue de formations et contenus pedagogiques",
    icon: BookOpen,
    href: "/console/academie/courses",
    count: 0,
  },
  {
    title: "Certifications",
    description: "Programmes de certification et validation des competences",
    icon: Award,
    href: "/console/academie/certifications",
    count: 0,
  },
  {
    title: "Boutique",
    description: "Articles, templates et ressources premium",
    icon: GraduationCap,
    href: "/console/academie/boutique",
    count: 0,
  },
];

export default function AcademiePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Academie"
        description="Formation, certifications et ressources pour l'ecosysteme LaFusee"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Academie" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Cours disponibles" value={0} icon={BookOpen} />
        <StatCard title="Apprenants inscrits" value={0} icon={Users} />
        <StatCard title="Certifications" value={0} icon={Award} />
        <StatCard title="Taux de completion" value="- %" icon={GraduationCap} />
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <a
              key={section.title}
              href={section.href}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-zinc-800 p-2.5">
                  <Icon className="h-5 w-5 text-zinc-400" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                {section.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">{section.description}</p>
              <p className="mt-3 text-2xl font-bold text-white">{section.count}</p>
              <p className="text-xs text-zinc-500">elements</p>
            </a>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Activite recente</h3>
        <EmptyState
          icon={GraduationCap}
          title="Aucune activite"
          description="L'activite de l'Academie apparaitra ici : inscriptions, completions, certifications."
        />
      </div>
    </div>
  );
}
