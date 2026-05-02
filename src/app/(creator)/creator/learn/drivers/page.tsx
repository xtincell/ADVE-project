"use client";

import { useState } from "react";
import {
  Camera as Instagram,
  Users as Facebook,
  Smartphone,
  Briefcase as Linkedin,
  Globe,
  Package,
  PartyPopper,
  Newspaper,
  Printer,
  Video,
  Radio,
  Tv,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs } from "@/components/shared/tabs";

type DriverType = "DIGITAL" | "PHYSICAL" | "EXPERIENTIAL" | "MEDIA";

interface DriverChannel {
  channel: string;
  label: string;
  type: DriverType;
  icon: LucideIcon;
  description: string;
}

const TYPE_COLORS: Record<DriverType, string> = {
  DIGITAL: "bg-blue-400/15 text-blue-400 ring-1 ring-blue-400/30",
  PHYSICAL: "bg-emerald-400/15 text-emerald-400 ring-1 ring-emerald-400/30",
  EXPERIENTIAL: "bg-purple-400/15 text-purple-400 ring-1 ring-purple-400/30",
  MEDIA: "bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30",
};

const TYPE_LABELS: Record<DriverType, string> = {
  DIGITAL: "Digital",
  PHYSICAL: "Physique",
  EXPERIENTIAL: "Experientiel",
  MEDIA: "Media",
};

const CHANNELS: DriverChannel[] = [
  {
    channel: "INSTAGRAM",
    label: "Instagram",
    type: "DIGITAL",
    icon: Instagram,
    description:
      "Creation de contenus visuels pour le feed, les Stories et les Reels. Le driver Instagram traduit la strategie ADVE en posts engageants, carousels educatifs et formats courts video adaptes a l'esthetique de la marque sur la plateforme.",
  },
  {
    channel: "FACEBOOK",
    label: "Facebook",
    type: "DIGITAL",
    icon: Facebook,
    description:
      "Production de contenus pour pages et groupes Facebook. Ce driver couvre les publications organiques, la moderation communautaire, les evenements Facebook et les formats publicitaires natifs pour toucher les audiences locales et regionales.",
  },
  {
    channel: "TIKTOK",
    label: "TikTok",
    type: "DIGITAL",
    icon: Smartphone,
    description:
      "Contenus video courts natifs pour TikTok. Ce driver se concentre sur les tendances audio, les challenges, le storytelling rapide et les formats authentiques qui resonnent avec les audiences Gen Z et millennials.",
  },
  {
    channel: "LINKEDIN",
    label: "LinkedIn",
    type: "DIGITAL",
    icon: Linkedin,
    description:
      "Contenus professionnels pour LinkedIn. Articles de thought leadership, posts corporate, presentations de cas clients et contenus employer branding adaptes au ton professionnel de la plateforme.",
  },
  {
    channel: "WEBSITE",
    label: "Website",
    type: "DIGITAL",
    icon: Globe,
    description:
      "Contenus web : landing pages, pages produit, articles de blog, UX writing. Ce driver assure la coherence du message de marque sur le site tout en optimisant pour le SEO et la conversion.",
  },
  {
    channel: "PACKAGING",
    label: "Packaging",
    type: "PHYSICAL",
    icon: Package,
    description:
      "Design et contenus pour emballages produit. Du texte reglementaire au storytelling visuel, ce driver traduit l'identite de marque sur les supports physiques que le consommateur touche et conserve.",
  },
  {
    channel: "EVENT",
    label: "Evenement",
    type: "EXPERIENTIAL",
    icon: PartyPopper,
    description:
      "Supports creatifs pour evenements : invitations, signalitique, presentations, animations visuelles. Ce driver materialise la marque dans l'espace physique pour creer des experiences memorables.",
  },
  {
    channel: "PR",
    label: "Relations Presse",
    type: "MEDIA",
    icon: Newspaper,
    description:
      "Communiques de presse, dossiers de presse, media kits. Ce driver transforme les messages de marque en angles journalistiques percutants pour generer des retombees media positives.",
  },
  {
    channel: "PRINT",
    label: "Print",
    type: "PHYSICAL",
    icon: Printer,
    description:
      "Supports imprimes : brochures, flyers, affiches, catalogues. Ce driver adapte l'identite visuelle et le message de marque aux contraintes et opportunites du medium imprime (CMJN, finitions, formats).",
  },
  {
    channel: "VIDEO",
    label: "Video",
    type: "MEDIA",
    icon: Video,
    description:
      "Production video longue et courte : spots publicitaires, videos corporate, temoignages, tutoriels. De la pre-production a la post-production, ce driver couvre tout le pipeline de creation video.",
  },
  {
    channel: "RADIO",
    label: "Radio",
    type: "MEDIA",
    icon: Radio,
    description:
      "Spots radio, jingles, sponsoring audio. Ce driver traduit le message de marque en format 100% sonore, avec une attention particuliere au scripting, a la voix et au sound design.",
  },
  {
    channel: "TV",
    label: "Television",
    type: "MEDIA",
    icon: Tv,
    description:
      "Spots TV, habillage antenne, product placement. Ce driver gere la creation de contenus pour le medium televisuel avec ses contraintes specifiques de duree, format et reglementation.",
  },
  {
    channel: "OOH",
    label: "Out-of-Home",
    type: "PHYSICAL",
    icon: MapPin,
    description:
      "Affichage exterieur : panneaux, abribus, affichage digital urbain. Ce driver adapte les visuels de marque aux grands formats et aux contraintes de lisibilite a distance et en mouvement.",
  },
];

const FILTER_TABS = [
  { key: "ALL", label: "Tous" },
  { key: "DIGITAL", label: "Digital" },
  { key: "PHYSICAL", label: "Physique" },
  { key: "EXPERIENTIAL", label: "Experientiel" },
  { key: "MEDIA", label: "Media" },
];

export default function LearnDriversPage() {
  const [activeFilter, setActiveFilter] = useState("ALL");

  const filtered =
    activeFilter === "ALL"
      ? CHANNELS
      : CHANNELS.filter((c) => c.type === activeFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guide des Drivers"
        description="Comprendre les drivers : traduction de la strategie ADVE en specifications par canal"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Apprendre" },
          { label: "Drivers" },
        ]}
      />

      {/* Intro section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h2 className="text-lg font-semibold text-white">
          Qu'est-ce qu'un Driver ?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Un <span className="font-semibold text-white">Driver</span> est le pont entre la strategie
          de marque ADVE-RTIS et l'execution creative concrete. Il traduit les orientations strategiques
          en specifications adaptees a un canal de communication specifique. Chaque Driver definit les formats,
          les contraintes techniques, le ton et les bonnes pratiques propres a son canal. Lorsqu'une mission
          est creee, elle est associee a un Driver qui guide le createur tout au long de la production.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(TYPE_LABELS) as DriverType[]).map((type) => {
            const count = CHANNELS.filter((c) => c.type === type).length;
            return (
              <div
                key={type}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center"
              >
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TYPE_COLORS[type]}`}>
                  {TYPE_LABELS[type]}
                </span>
                <p className="mt-1.5 text-lg font-bold text-white">{count}</p>
                <p className="text-[11px] text-zinc-500">canaux</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <Tabs
        tabs={FILTER_TABS.map((t) => ({
          key: t.key,
          label: t.label,
          count: t.key === "ALL" ? CHANNELS.length : CHANNELS.filter((c) => c.type === t.key).length,
        }))}
        activeTab={activeFilter}
        onChange={setActiveFilter}
      />

      {/* Channel cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((channel) => {
          const Icon = channel.icon;
          return (
            <div
              key={channel.channel}
              className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                    <Icon className="h-5 w-5 text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{channel.label}</h3>
                    <p className="text-[11px] text-zinc-500">{channel.channel}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[channel.type]}`}
                >
                  {TYPE_LABELS[channel.type]}
                </span>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                {channel.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-500">Aucun driver dans cette categorie.</p>
        </div>
      )}
    </div>
  );
}
