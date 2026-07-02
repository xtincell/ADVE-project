"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookMarked,
  ClipboardList,
  Compass,
  CreditCard,
  FolderOutput,
  Gem,
  GitBranch,
  History,
  Megaphone,
  Package,
  Rocket,
  ScrollText,
  Settings,
  Vault,
} from "lucide-react";
import { cva } from "class-variance-authority";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ "aria-hidden"?: boolean }>;
  /** true = actif uniquement sur l'URL exacte (racine /app). */
  exact?: boolean;
  /** Préfixe supplémentaire qui active l'entrée (pages filles hors href). */
  alsoPrefix?: string;
};

type NavGroup = { label: string | null; items: NavItem[] };

/**
 * Navigation de l'espace marque. Groupes :
 *   pilotage   — dashboard piliers, diagnostic, dérivés RTIS (WP-005 + WP-016)
 *   vues       — regroupements éditoriaux par thème (WP-016, zéro donnée nouvelle)
 *   livrables  — Oracle (WP-006), coffre + charte (WP-019), hub exports et traçabilité (WP-016)
 *   production — pipeline campagnes → actions → briefs → missions (WP-008)
 *   compte     — facturation (WP-007)
 */
const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      // Les pages piliers appartiennent à « Ma marque » (grille bento → éditeur).
      { href: "/app", label: "Ma marque", icon: Rocket, exact: true, alsoPrefix: "/app/pilier" },
      { href: "/app/diagnostic", label: "Diagnostic", icon: Activity },
      { href: "/app/rtis", label: "RTIS", icon: GitBranch },
    ],
  },
  {
    label: "Vues marque",
    items: [
      { href: "/app/positionnement", label: "Positionnement", icon: Compass },
      { href: "/app/proposition", label: "Proposition", icon: Gem },
      { href: "/app/offre", label: "Offre & pricing", icon: Package },
    ],
  },
  {
    label: "Livrables",
    items: [
      { href: "/app/oracle", label: "Oracle", icon: ScrollText },
      { href: "/app/vault", label: "Coffre", icon: Vault },
      { href: "/app/guidelines", label: "Charte", icon: BookMarked },
      { href: "/app/exports", label: "Exports", icon: FolderOutput },
      { href: "/app/revisions", label: "Révisions", icon: History },
    ],
  },
  {
    label: "Production",
    items: [
      { href: "/campagnes", label: "Campagnes", icon: Megaphone },
      { href: "/missions", label: "Missions", icon: ClipboardList },
    ],
  },
  {
    label: "Compte",
    items: [
      { href: "/app/facturation", label: "Facturation", icon: CreditCard },
      { href: "/reglages", label: "Réglages", icon: Settings },
    ],
  },
];

const navLinkVariants = cva(
  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors [&_svg]:size-4.5 [&_svg]:shrink-0",
  {
    variants: {
      active: {
        true: "bg-ink-3 text-bone",
        false: "text-sand hover:bg-ink-2 hover:text-bone",
      },
    },
  },
);

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5" aria-label="Navigation de l'espace marque">
      {NAV_GROUPS.map((group, i) => (
        <div key={group.label ?? `groupe-${i}`} className="flex flex-col gap-1">
          {group.label ? (
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-smoke-2">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const active =
              (item.exact ? pathname === item.href : pathname.startsWith(item.href)) ||
              (item.alsoPrefix !== undefined && pathname.startsWith(item.alsoPrefix));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkVariants({ active })}
                aria-current={active ? "page" : undefined}
              >
                <item.icon aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
