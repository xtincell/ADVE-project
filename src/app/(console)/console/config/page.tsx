"use client";

import { PageHeader } from "@/components/shared/page-header";
import {
  Settings,
  SlidersHorizontal,
  FileCode,
  ArrowRight,
  Plug,
  Server,
} from "lucide-react";

const CONFIG_SECTIONS = [
  {
    title: "Seuils & parametres",
    description: "Seuils de scoring, tiers, et parametres metier",
    icon: SlidersHorizontal,
    items: [
      "Seuils de promotion de tier",
      "Parametres ADVERTIS",
      "Taux de commission par tier",
      "Seuils d'alerte qualite",
    ],
  },
  {
    title: "Templates",
    description: "Modeles de documents, emails et rapports",
    icon: FileCode,
    items: [
      "Templates email",
      "Templates de rapport",
      "Templates contrat",
      "Templates facture",
    ],
  },
];

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuration"
        description="Parametres systeme, seuils et templates de l'ecosysteme"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Configuration" },
        ]}
      />

      {/* Quick nav */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <a
          href="/console/config/integrations"
          className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-zinc-800 p-2">
              <Plug className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Integrations</p>
              <p className="text-xs text-zinc-500">Connexions externes</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
        </a>

        <a
          href="/console/config/system"
          className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-zinc-800 p-2">
              <Server className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Systeme</p>
              <p className="text-xs text-zinc-500">Sante et audit</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
        </a>

        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-zinc-800 p-2">
              <Settings className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">General</p>
              <p className="text-xs text-zinc-500">Parametres globaux</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration sections */}
      {CONFIG_SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <div
            key={section.title}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <Icon className="h-5 w-5 text-zinc-400" />
              <h3 className="text-sm font-semibold text-white">{section.title}</h3>
            </div>
            <p className="mb-4 text-sm text-zinc-400">{section.description}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {section.items.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3"
                >
                  <span className="text-sm text-zinc-300">{item}</span>
                  <button className="text-xs text-zinc-500 hover:text-white">
                    Configurer
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
