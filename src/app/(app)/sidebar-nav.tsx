"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Rocket, ScrollText } from "lucide-react";
import { cva } from "class-variance-authority";

const NAV_ITEMS = [
  { href: "/app", label: "Ma marque", icon: Rocket, exact: true },
  { href: "/app/oracle", label: "Oracle", icon: ScrollText, exact: false },
  { href: "/app/facturation", label: "Facturation", icon: CreditCard, exact: false },
] as const;

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
    <nav className="flex flex-col gap-1" aria-label="Navigation de l'espace marque">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
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
    </nav>
  );
}
