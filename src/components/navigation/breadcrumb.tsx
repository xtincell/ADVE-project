"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { APP_ROUTES } from "@/lib/generated/app-routes";

const SEGMENT_LABELS: Record<string, string> = {
  cockpit: "Cockpit",
  creator: "Espace créateur",
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
  mestor: "Assistant",
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
  fusee: "La Fusée",
  socle: "Le Socle",
  clients: "Clients",
  intake: "Pipeline Intake",
  boot: "Démarrage",
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
    // Only linkify segments that resolve to a real page. Section containers
    // (e.g. /console/socle) have sub-pages but no index page → linking them
    // 404s (site-prober finding). Such segments render as plain text.
    const navigable = !isLast && APP_ROUTES.has(href);
    return { href, label, isLast, navigable };
  });

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-foreground-muted" />}
          {crumb.navigable ? (
            <Link
              href={crumb.href}
              className="text-foreground-muted transition-colors hover:text-foreground-secondary"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className={crumb.isLast ? "font-medium text-foreground" : "text-foreground-muted"}>
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
