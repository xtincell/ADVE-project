"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs } from "@/components/shared/tabs";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { BookOpen, GraduationCap, Users, Clock } from "lucide-react";

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const { data: courses, isLoading } = trpc.learning.listCourses.useQuery({});

  if (isLoading) return <SkeletonPage />;

  const allCourses = courses ?? [];
  const published = allCourses.filter((c) => c.isPublished);
  const draft = allCourses.filter((c) => !c.isPublished);
  const filtered = activeTab === "published" ? published : activeTab === "draft" ? draft : allCourses;

  const tabs = [
    { key: "all", label: "Tous", count: allCourses.length },
    { key: "published", label: "Publies", count: published.length },
    { key: "draft", label: "Brouillons", count: draft.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Formations" description="Cours, bootcamps et parcours de formation ADVE" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Academie", href: "/console/academie" }, { label: "Formations" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total cours" value={allCourses.length} icon={BookOpen} />
        <StatCard title="Publies" value={published.length} icon={GraduationCap} />
        <StatCard title="Brouillons" value={draft.length} icon={Clock} />
        <StatCard title="Inscrits" value="—" icon={Users} />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aucun cours" description="Creez un cours pour commencer. Les formations ADVE aident les creatifs a monter en competences." />
      ) : (
        <div className="space-y-2">
          {filtered.map((course) => (
            <div key={course.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card-hover">
              <div>
                <p className="text-sm font-medium text-foreground">{course.title}</p>
                <p className="text-xs text-foreground-muted">
                  {course.level} · {course.category}
                  {course.duration ? ` · ${course.duration}min` : ""}
                </p>
              </div>
              <StatusBadge status={course.isPublished ? "PUBLISHED" : "DRAFT"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
