"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cva } from "class-variance-authority";

const NAV_ITEMS = [
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/paiements", label: "Paiements" },
  { href: "/admin/abonnements", label: "Abonnements" },
  { href: "/admin/marques", label: "Marques" },
  { href: "/admin/campagnes", label: "Campagnes" },
  { href: "/admin/talents", label: "Talents" },
  { href: "/admin/exports", label: "Exports" },
  { href: "/admin/workspaces", label: "Workspaces" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/referentiels", label: "Référentiels" },
  { href: "/admin/audit", label: "Audit" },
] as const;

const topbarLinkVariants = cva(
  "whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
  {
    variants: {
      active: {
        true: "bg-ink-3 text-bone",
        false: "text-sand hover:text-bone",
      },
    },
  },
);

export function TopbarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Navigation admin">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={topbarLinkVariants({ active })}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
