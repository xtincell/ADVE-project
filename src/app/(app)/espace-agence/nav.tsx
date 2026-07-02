"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cva } from "class-variance-authority";

/**
 * Onglets de l'espace agence (WP-018) — remplace la sidebar du portail
 * `(agency)` legacy par une nav horizontale dans le shell (app) existant.
 * Les cinq sections lisent toutes le MÊME périmètre flotte (server/agency.ts).
 */
type Tab = { href: string; label: string; exact?: boolean };

const TABS: Tab[] = [
  { href: "/espace-agence", label: "Vue d'ensemble", exact: true },
  { href: "/espace-agence/clients", label: "Clients" },
  { href: "/espace-agence/campagnes", label: "Campagnes" },
  { href: "/espace-agence/missions", label: "Missions" },
  { href: "/espace-agence/revenus", label: "Revenus" },
];

const tabVariants = cva(
  "-mb-px inline-flex items-center border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
  {
    variants: {
      active: {
        true: "border-coral text-bone",
        false: "border-transparent text-sand hover:border-line hover:text-bone",
      },
    },
  },
);

export function AgencyNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections de l'espace agence" className="border-b border-line">
      <div className="flex flex-wrap gap-x-6">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={tabVariants({ active })}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
