"use client";

/**
 * La Guilde — coque publique (header + footer). ADR-0098.
 * Header de navigation du portail public + pied de page. DS panda + rouge.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/LaGuilde", label: "Le mur", exact: true },
  { href: "/LaGuilde/publier", label: "Publier une mission" },
  { href: "/LaGuilde/rejoindre", label: "Rejoindre la Guilde" },
];

export function GuildShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[var(--z-topbar)] border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[var(--maxw-content)] items-center justify-between px-[var(--pad-page)]">
          <Link href="/LaGuilde" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Rocket className="h-4 w-4" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight text-foreground">La Guilde</span>
              <span className="text-2xs uppercase tracking-wider text-muted-foreground">
                par La Fusée
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive(item.href, item.exact)
                    ? "font-semibold text-foreground"
                    : "text-foreground-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {status === "authenticated" ? (
              <Link
                href="/portals"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground"
              >
                Mon espace
              </Link>
            ) : (
              <Link
                href="/login?callbackUrl=/LaGuilde"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground"
              >
                Connexion
              </Link>
            )}
            <Link
              href="/LaGuilde/publier"
              className="rounded-[var(--button-radius)] bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Publier
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-background-subtle">
        <div className="mx-auto flex max-w-[var(--maxw-content)] flex-col gap-2 px-[var(--pad-page)] py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            <span className="font-semibold text-foreground">La Guilde</span> — le marketplace
            créatif de La Fusée. Marques, freelances & agences de prod en Afrique francophone.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/LaGuilde/rejoindre" className="hover:text-foreground">
              Devenir membre
            </Link>
            <Link href="/cgu" className="hover:text-foreground">
              CGU
            </Link>
            <Link href="/cgv" className="hover:text-foreground">
              CGV
            </Link>
            <Link href="/" className="hover:text-foreground">
              La Fusée
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
