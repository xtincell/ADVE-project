"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { GraduationCap, BookOpen, Award, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function AcademiePage() {
  const { data: courses, isLoading: loadingCourses } = trpc.learning.listCourses.useQuery({});
  const { data: boutique, isLoading: loadingBoutique } = trpc.boutique.listItems.useQuery({});

  if (loadingCourses || loadingBoutique) return <SkeletonPage />;

  const allCourses = courses ?? [];
  const published = allCourses.filter((c) => c.isPublished);
  const items = boutique ?? [];

  const sections = [
    { href: "/console/academie/courses", label: "Formations", desc: "Cours, bootcamps et parcours de formation ADVE", icon: BookOpen, stat: `${published.length} cours publies` },
    { href: "/console/academie/certifications", label: "Certifications", desc: "Certifications ADVE en cours et delivrees", icon: Award, stat: "—" },
    { href: "/console/academie/boutique", label: "Boutique", desc: "Playbooks, templates et ventes", icon: ShoppingBag, stat: `${items.length} articles` },
    { href: "/console/academie/content", label: "Contenu editorial", desc: "The Upgrade — contenu de marque et editorial", icon: GraduationCap, stat: "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="L'Academie" description="Formation, certifications, contenu editorial et boutique" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Academie" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Cours publies" value={published.length} icon={BookOpen} />
        <StatCard title="Total cours" value={allCourses.length} icon={GraduationCap} />
        <StatCard title="Articles boutique" value={items.length} icon={ShoppingBag} />
        <StatCard title="Certifications" value="—" icon={Award} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl border border-border bg-card p-6 transition-all hover:bg-card-hover hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-subtle p-2"><s.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
                <p className="text-xs text-foreground-muted">{s.desc}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-foreground-muted">{s.stat}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
