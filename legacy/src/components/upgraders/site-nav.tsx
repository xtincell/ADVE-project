"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, LayoutGrid, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NAV_ITEMS } from "./data";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center" aria-label="UPgraders — accueil">
      {/* Responsive show/hide on the WRAPPER, not the <img> : `.up-logo__img`
          forces display:block (upgraders.css) et écraserait `hidden`/`sm:hidden`
          appliqués directement sur l'image → les deux logos s'afficheraient. */}
      <span className="hidden sm:block">
        <Logo variant="lockup-horizontal" size={30} alt="UPgraders" />
      </span>
      <span className="sm:hidden">
        <Logo variant="mark" size={30} alt="UPgraders" />
      </span>
    </Link>
  );
}

function SessionLink() {
  const { data: session, status } = useSession();
  if (status === "authenticated" && session?.user) {
    return (
      <Link
        href="/portals"
        className="hidden items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-foreground sm:inline-flex"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Mon espace
      </Link>
    );
  }
  return (
    <Link href="/login" className="hidden text-sm text-foreground-secondary transition-colors hover:text-foreground sm:inline">
      Connexion
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <nav className="fixed inset-x-0 top-0 z-[var(--z-topbar)] border-b border-border-subtle bg-background/70 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-[var(--maxw-content)] items-center justify-between px-[var(--pad-page)] py-4">
        <Wordmark />

        <div className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(it.href) ? "page" : undefined}
              className={
                isActive(it.href)
                  ? "text-sm text-foreground"
                  : "text-sm text-foreground-secondary transition-colors hover:text-foreground"
              }
            >
              {it.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/lafusee"
            className="hidden items-center gap-1.5 font-mono text-2xs uppercase tracking-widest text-foreground-muted transition-colors hover:text-accent md:inline-flex"
          >
            La Fusée
            <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
          </Link>
          <SessionLink />
          <a
            href="/contact"
            className="hidden items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:inline-flex"
          >
            Démarrer un projet
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center text-foreground lg:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border-subtle bg-background/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-[var(--maxw-content)] flex-col px-[var(--pad-page)] py-3">
            {NAV_ITEMS.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="border-b border-border-subtle py-3 text-sm text-foreground-secondary transition-colors hover:text-foreground"
              >
                {it.label}
              </Link>
            ))}
            <Link
              href="/lafusee"
              onClick={() => setOpen(false)}
              className="border-b border-border-subtle py-3 font-mono text-2xs uppercase tracking-widest text-foreground-muted transition-colors hover:text-accent"
            >
              La Fusée — l&apos;OS produit
            </Link>
            <div className="flex items-center gap-3 pt-4">
              <a
                href="/contact"
                className="inline-flex flex-1 items-center justify-center gap-2 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground"
              >
                Démarrer un projet
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <Link href="/login" onClick={() => setOpen(false)} className="px-3 py-3 text-sm text-foreground-secondary">
                Connexion
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
