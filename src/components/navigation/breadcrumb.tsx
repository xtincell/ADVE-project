"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  cockpit: "Brand OS",
  creator: "Guild OS",
  console: "Console",
  operate: "Operations",
  brand: "Marque",
  insights: "Insights",
  missions: "Missions",
  campaigns: "Campagnes",
  briefs: "Briefs",
  requests: "Demandes",
  identity: "Identite",
  guidelines: "Guidelines",
  assets: "Assets",
  reports: "Rapports",
  diagnostics: "Diagnostics",
  benchmarks: "Benchmarks",
  attribution: "Attribution",
  messages: "Messages",
  mestor: "Mestor AI",
  available: "Disponibles",
  active: "En cours",
  collab: "Collaboratives",
  qc: "Qualite",
  submitted: "Soumissions",
  peer: "Peer Review",
  progress: "Progression",
  metrics: "Metriques",
  path: "Parcours",
  strengths: "Forces",
  earnings: "Gains",
  history: "Historique",
  invoices: "Factures",
  profile: "Profil",
  skills: "Competences",
  drivers: "Drivers",
  portfolio: "Portfolio",
  learn: "Apprendre",
  adve: "ADVE",
  cases: "Cas",
  resources: "Ressources",
  community: "Communaute",
  guild: "Guilde",
  events: "Evenements",
  oracle: "L'Oracle",
  signal: "Le Signal",
  arene: "L'Arene",
  fusee: "La Fusee",
  socle: "Le Socle",
  clients: "Clients",
  intake: "Pipeline Intake",
  boot: "Boot Sequence",
  intelligence: "Intelligence",
  signals: "Signaux",
  knowledge: "Knowledge Graph",
  market: "Marche",
  matching: "Matching",
  orgs: "Organisations",
  revenue: "Revenus",
  commissions: "Commissions",
  pipeline: "Pipeline",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = SEGMENT_LABELS[segment] || segment;
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-foreground-muted" />}
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-foreground-muted transition-colors hover:text-foreground-secondary"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
