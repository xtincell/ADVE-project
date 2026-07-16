"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LayoutGrid, Menu, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { LocaleToggle } from "@/components/i18n/locale-toggle";
import { APP_VERSION } from "@/lib/version";

function firstName(name: string | null | undefined, email: string | null | undefined, fallback: string): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0]!;
  if (email) return email.split("@")[0]!;
  return fallback;
}

function NavSessionLink() {
  const { data: session, status } = useSession();
  const { t } = useLocale();

  // SSR + état "loading" + "unauthenticated" → "Connexion" (défaut sain :
  // un visiteur landing est anonyme jusqu'à preuve du contraire). On bascule
  // vers le prénom + lien /portals seulement quand la session est confirmée.
  if (status === "authenticated" && session?.user) {
    const name = firstName(session.user.name, session.user.email, t("landing.nav.space"));
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
      {t("landing.nav.login")}
    </Link>
  );
}

/* La Fusée brand lockup — official mark + wordmark + version tag (design MkBrand). */
function FuseeBrand() {
  return (
    <Link href="/lafusee" className="flex items-center gap-2.5" aria-label="La Fusée">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logos/lafusee-logo.png" alt="" aria-hidden="true" className="h-6 w-auto sm:h-7" />
      <span className="font-semibold tracking-tight text-base">
        La Fusée<span className="text-accent">.</span>
      </span>
      {/* Version RÉELLE (audit design 2026-07-16 §A3 : « v6.27 » était figé en dur). */}
      <span className="hidden text-2xs font-mono text-foreground-muted px-1.5 py-0.5 border border-border sm:inline">v{APP_VERSION}</span>
    </Link>
  );
}

export function MarketingNav() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const links: { href: string; label: string }[] = [
    { href: "#manifesto", label: t("landing.nav.manifesto") },
    { href: "#methode", label: t("landing.nav.method") },
    { href: "#apogee", label: t("landing.nav.apogee") },
    { href: "#gouverneurs", label: t("landing.nav.governors") },
    { href: "#portails", label: t("landing.nav.portals") },
    { href: "#tarifs", label: t("landing.nav.pricing") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[var(--z-topbar)] backdrop-blur-md bg-background/60 border-b border-border-subtle print:hidden">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] flex items-center justify-between py-4">
        <FuseeBrand />

        <div className="hidden lg:flex gap-7 text-sm">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-foreground-secondary hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Retour vers le site UPgraders (La Fusée = produit d'UPgraders) */}
          <Link
            href="/"
            className="hidden md:inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest text-foreground-muted transition-colors hover:text-accent"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M11 5l-7 7 7 7" /></svg>
            UPgraders
          </Link>
          <LocaleToggle variant="compact" />
          <NavSessionLink />
          <a
            href="/intake"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            {t("landing.nav.cta")}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
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
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-border-subtle py-3 text-sm text-foreground-secondary transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/intake"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center gap-2 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground"
            >
              {t("landing.nav.cta")}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
