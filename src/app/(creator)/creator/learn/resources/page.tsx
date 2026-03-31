"use client";

import { useState } from "react";
import {
  Wrench,
  FileText,
  BookOpen,
  Users,
  ExternalLink,
  type LucideIcon,
  Sparkles,
  ClipboardCheck,
  Palette,
  BarChart3,
  FileSearch,
  PenTool,
  Layout,
  Shield,
  MessageCircle,
  Calendar,
  GraduationCap,
  Heart,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs } from "@/components/shared/tabs";

type ResourceType = "TOOL" | "TEMPLATE" | "GUIDE" | "COMMUNITY";

interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  icon: LucideIcon;
  category: string;
  href: string;
}

const TYPE_BADGE: Record<ResourceType, { label: string; color: string }> = {
  TOOL: { label: "Outil", color: "bg-blue-400/15 text-blue-400 ring-1 ring-blue-400/30" },
  TEMPLATE: { label: "Template", color: "bg-emerald-400/15 text-emerald-400 ring-1 ring-emerald-400/30" },
  GUIDE: { label: "Guide", color: "bg-purple-400/15 text-purple-400 ring-1 ring-purple-400/30" },
  COMMUNITY: { label: "Communaute", color: "bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30" },
};

const CATEGORIES = [
  { key: "ALL", label: "Tous" },
  { key: "Outils", label: "Outils" },
  { key: "Templates", label: "Templates" },
  { key: "Guides", label: "Guides" },
  { key: "Communaute", label: "Communaute" },
];

const RESOURCES: Resource[] = [
  // --- Outils (Glory tools documentation) ---
  {
    id: "tool-1",
    title: "ADVE Scorer",
    description:
      "Outil d'evaluation des livrables sur les 8 pilliers ADVE-RTIS. Permet de scorer un livrable avant soumission et d'identifier les axes d'amelioration par pillier.",
    type: "TOOL",
    icon: BarChart3,
    category: "Outils",
    href: "/creator/progress/strengths",
  },
  {
    id: "tool-2",
    title: "Brand Auditor",
    description:
      "Outil d'audit de marque du pipeline BRAND. Analyse l'identite existante, benchmark concurrentiel et genere un rapport de positionnement.",
    type: "TOOL",
    icon: FileSearch,
    category: "Outils",
    href: "/creator/learn/adve",
  },
  {
    id: "tool-3",
    title: "Driver Configurator",
    description:
      "Configure les specifications techniques par canal de communication. Genere les specs de format, taille, duree et les guidelines editoriales pour chaque driver.",
    type: "TOOL",
    icon: Wrench,
    category: "Outils",
    href: "/creator/profile/drivers",
  },
  {
    id: "tool-4",
    title: "Creative Brief Builder",
    description:
      "Generateur de briefs creatifs structures autour des pilliers ADVE. Transforme les objectifs strategiques en directives actionnables pour les createurs.",
    type: "TOOL",
    icon: PenTool,
    category: "Outils",
    href: "/creator/missions/active",
  },
  {
    id: "tool-5",
    title: "QC Checklist Engine",
    description:
      "Outil de generation de checklists QC adaptees au driver et au type de livrable. Assure une evaluation complete et coherente a chaque soumission.",
    type: "TOOL",
    icon: ClipboardCheck,
    category: "Outils",
    href: "/creator/qc/submitted",
  },
  // --- Templates ---
  {
    id: "tpl-1",
    title: "Brief creatif — Template standard",
    description:
      "Modele de brief creatif pre-structure avec les sections ADVE. Inclut les champs pour chaque pillier, les specs techniques et les references visuelles.",
    type: "TEMPLATE",
    icon: FileText,
    category: "Templates",
    href: "/creator/missions/active",
  },
  {
    id: "tpl-2",
    title: "Checklist QC pre-soumission",
    description:
      "Checklist a completer avant de soumettre un livrable au QC. Couvre les formats, la conformite, la coherence de marque et les criteres ADVE essentiels.",
    type: "TEMPLATE",
    icon: ClipboardCheck,
    category: "Templates",
    href: "/creator/qc/submitted",
  },
  {
    id: "tpl-3",
    title: "Rapport de campagne",
    description:
      "Template de rapport post-campagne avec sections pour les KPIs, les scores ADVE, les enseignements et les recommandations pour les prochaines iterations.",
    type: "TEMPLATE",
    icon: Layout,
    category: "Templates",
    href: "/creator/progress/metrics",
  },
  {
    id: "tpl-4",
    title: "Matrice risque reputationnel",
    description:
      "Template d'evaluation des risques pour le pillier R. Grille d'analyse des sensibilites culturelles, legales et reputationnelles d'un contenu avant publication.",
    type: "TEMPLATE",
    icon: Shield,
    category: "Templates",
    href: "/creator/learn/adve",
  },
  // --- Guides ---
  {
    id: "guide-1",
    title: "Guide du style visuel La Fusee",
    description:
      "Charte graphique et guidelines visuelles de la plateforme. Couleurs, typographies, espacements, icones et principes de design a respecter sur tous les livrables.",
    type: "GUIDE",
    icon: Palette,
    category: "Guides",
    href: "/creator/learn/drivers",
  },
  {
    id: "guide-2",
    title: "Best practices — Brand Guidelines",
    description:
      "Guide des meilleures pratiques pour creer et maintenir des brand guidelines solides. Comment structurer une charte, definir un territoire de marque et assurer la coherence.",
    type: "GUIDE",
    icon: BookOpen,
    category: "Guides",
    href: "/creator/learn/cases",
  },
  {
    id: "guide-3",
    title: "Glossaire ADVE-RTIS complet",
    description:
      "Dictionnaire de tous les termes du framework ADVE-RTIS avec definitions, exemples et contextes d'utilisation. Reference essentielle pour les nouveaux createurs.",
    type: "GUIDE",
    icon: Sparkles,
    category: "Guides",
    href: "/creator/learn/adve",
  },
  {
    id: "guide-4",
    title: "Guide de production video",
    description:
      "De la pre-production a la livraison : workflow complet, checklist equipement, guidelines de tournage, post-production et specifications de livraison par format.",
    type: "GUIDE",
    icon: BookOpen,
    category: "Guides",
    href: "/creator/learn/drivers",
  },
  // --- Communaute ---
  {
    id: "comm-1",
    title: "Guild Community Forum",
    description:
      "Espace d'echange entre createurs de la Guild. Partagez vos experiences, posez des questions, donnez et recevez du feedback sur vos travaux en cours.",
    type: "COMMUNITY",
    icon: MessageCircle,
    category: "Communaute",
    href: "/creator/community/guild",
  },
  {
    id: "comm-2",
    title: "Evenements & Workshops",
    description:
      "Calendrier des evenements de formation, workshops pratiques et sessions de mentorat organises par la Guild. Formations en ligne et en presentiel.",
    type: "COMMUNITY",
    icon: Calendar,
    category: "Communaute",
    href: "/creator/community/events",
  },
  {
    id: "comm-3",
    title: "Programme de mentorat",
    description:
      "Systeme de mentorat pair-a-pair entre createurs experimentes (Maitre/Associe) et nouveaux membres. Accompagnement personnalise sur les missions et la progression de tier.",
    type: "COMMUNITY",
    icon: GraduationCap,
    category: "Communaute",
    href: "/creator/progress/path",
  },
  {
    id: "comm-4",
    title: "Vitrine des createurs",
    description:
      "Portfolio collaboratif mettant en avant les meilleurs livrables de la Guild. Source d'inspiration et reconnaissance pour les createurs les plus performants.",
    type: "COMMUNITY",
    icon: Heart,
    category: "Communaute",
    href: "/creator/profile/portfolio",
  },
];

export default function LearnResourcesPage() {
  const [activeCategory, setActiveCategory] = useState("ALL");

  const filtered =
    activeCategory === "ALL"
      ? RESOURCES
      : RESOURCES.filter((r) => r.category === activeCategory);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ressources"
        description="Outils, templates, guides et liens communautaires pour les createurs"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Apprendre" },
          { label: "Ressources" },
        ]}
      />

      {/* Category tabs */}
      <Tabs
        tabs={CATEGORIES.map((c) => ({
          key: c.key,
          label: c.label,
          count:
            c.key === "ALL"
              ? RESOURCES.length
              : RESOURCES.filter((r) => r.category === c.key).length,
        }))}
        activeTab={activeCategory}
        onChange={setActiveCategory}
      />

      {/* Section headers when showing all */}
      {activeCategory === "ALL" ? (
        <>
          {["Outils", "Templates", "Guides", "Communaute"].map((section) => {
            const sectionResources = RESOURCES.filter((r) => r.category === section);
            return (
              <div key={section}>
                <h2 className="mb-3 text-lg font-semibold text-white">{section}</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {sectionResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-500">Aucune ressource dans cette categorie.</p>
        </div>
      )}
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const Icon = resource.icon;
  const badge = TYPE_BADGE[resource.type];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
          <Icon className="h-5 w-5 text-zinc-300" />
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.color}`}
        >
          {badge.label}
        </span>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-white">{resource.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{resource.description}</p>

      <a
        href={resource.href}
        className="mt-4 flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Acceder
      </a>
    </div>
  );
}
