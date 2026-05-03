"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { LayoutGrid } from "lucide-react";

function firstName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0]!;
  if (email) return email.split("@")[0]!;
  return "Mon espace";
}

function NavSessionLink() {
  const { data: session, status } = useSession();

  // SSR + état "loading" + "unauthenticated" → "Connexion" (défaut sain :
  // un visiteur landing est anonyme jusqu'à preuve du contraire). On bascule
  // vers le prénom + lien /portals seulement quand la session est confirmée.
  if (status === "authenticated" && session?.user) {
    const name = firstName(session.user.name, session.user.email);
    return (
      <Link
        href="/portals"
        className="hidden sm:inline-flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground transition-colors"
        aria-label={`Aller au hub des portails (connecté en tant que ${name})`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        {name}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="hidden sm:inline text-sm text-foreground-secondary hover:text-foreground transition-colors"
    >
      Connexion
    </Link>
  );
}

export function MarketingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[var(--z-topbar)] backdrop-blur-md bg-background/60 border-b border-border-subtle">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="La Fusée">
          <span aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
              <rect x="14" y="2" width="4" height="22" fill="var(--color-foreground)" />
              <path d="M16 2 L20 8 L12 8 Z" fill="var(--color-accent)" />
              <rect x="10" y="20" width="12" height="4" fill="var(--color-foreground)" />
              <path d="M10 24 L16 30 L22 24 Z" fill="var(--color-accent)" />
            </svg>
          </span>
          <span className="font-semibold tracking-tight text-base">
            La Fusée<span className="text-accent">.</span>
          </span>
          <span className="text-[10px] font-mono text-foreground-muted px-1.5 py-0.5 border border-border">v6.1</span>
        </Link>

        <div className="hidden lg:flex gap-7 text-sm">
          <a href="#manifesto" className="text-foreground-secondary hover:text-foreground transition-colors">Manifeste</a>
          <a href="#methode" className="text-foreground-secondary hover:text-foreground transition-colors">Méthode</a>
          <a href="#apogee" className="text-foreground-secondary hover:text-foreground transition-colors">APOGEE</a>
          <a href="#gouverneurs" className="text-foreground-secondary hover:text-foreground transition-colors">Gouverneurs</a>
          <a href="#portails" className="text-foreground-secondary hover:text-foreground transition-colors">Portails</a>
          <a href="#tarifs" className="text-foreground-secondary hover:text-foreground transition-colors">Tarifs</a>
        </div>

        <div className="flex items-center gap-4">
          <NavSessionLink />
          <a
            href="/intake"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Diagnostic instantané
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </nav>
  );
}
