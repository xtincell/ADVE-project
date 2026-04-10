"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Newspaper, BookOpen, TrendingUp, Users } from "lucide-react";

export default function AcademieContentPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Contenu editorial — The Upgrade" description="Contenu de marque, articles, newsletters et editorial LaFusee" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Academie", href: "/console/academie" }, { label: "Contenu" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Articles" value={0} icon={Newspaper} />
        <StatCard title="Newsletters" value={0} icon={BookOpen} />
        <StatCard title="Lecteurs" value="—" icon={Users} />
        <StatCard title="Engagement" value="—" icon={TrendingUp} />
      </div>

      <EmptyState icon={Newspaper} title="Aucun contenu editorial" description="The Upgrade — le programme de contenu editorial de LaFusee. Articles, etudes de cas, insights sectoriels et newsletters." />
    </div>
  );
}
