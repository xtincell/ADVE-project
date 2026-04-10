"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Award, Users, CheckCircle, Clock } from "lucide-react";

export default function CertificationsPage() {
  const { data: courses, isLoading } = trpc.learning.listCourses.useQuery({});

  if (isLoading) return <SkeletonPage />;

  // Courses that are certification-type
  const certCourses = (courses ?? []).filter((c) => c.category === "CERTIFICATION" || c.category === "certification");

  return (
    <div className="space-y-6">
      <PageHeader title="Certifications ADVE" description="Programme de certification par pilier — suivi des candidats et delivrance" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Academie", href: "/console/academie" }, { label: "Certifications" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Programmes" value={certCourses.length} icon={Award} />
        <StatCard title="Candidats actifs" value="—" icon={Users} />
        <StatCard title="Certifies" value="—" icon={CheckCircle} />
        <StatCard title="En cours" value="—" icon={Clock} />
      </div>

      {certCourses.length === 0 ? (
        <EmptyState icon={Award} title="Aucune certification" description="Les certifications ADVE seront disponibles ici. Les creatifs pourront se certifier par pilier." />
      ) : (
        <div className="space-y-2">
          {certCourses.map((cert) => (
            <div key={cert.id} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">{cert.title}</p>
              <p className="text-xs text-foreground-muted">{cert.level} · {cert.category}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
