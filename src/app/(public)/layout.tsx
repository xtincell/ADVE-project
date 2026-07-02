import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { IDENTITY } from "@/components/marketing/site-data";
import { productSiteUrl } from "@/lib/hosts";

/**
 * Shell public — navigation à deux contextes (WP-025) :
 *   · header = nav générale UPgraders (l'AGENCE : Agence, Méthode, Services,
 *     Réalisations, Blog, Contact) + entrée distincte mise en avant
 *     « La Fusée » → le sous-domaine produit (URL absolue, cf. lib/hosts) ;
 *   · les pages /lafusee* ajoutent leur SOUS-nav produit (lafusee/layout.tsx).
 * Footer trois colonnes : UPgraders (agence) · La Fusée (produit) · légal.
 */

const NAV_LINKS = [
  { href: "/agence", label: "Agence" },
  { href: "/methode", label: "Méthode" },
  { href: "/services", label: "Services" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

/** Entrée produit mise en avant — absolue vers le sous-domaine (WP-025). */
const PRODUCT_ENTRY = { href: productSiteUrl(), label: "La Fusée" } as const;

const FOOTER_AGENCE = [
  { href: "/agence", label: "Qui sommes-nous" },
  { href: "/methode", label: "La méthode ADVE/RTIS" },
  { href: "/services", label: "Services — sur devis" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

const FOOTER_PRODUIT = [
  { href: productSiteUrl(), label: "La Fusée — le produit" },
  { href: productSiteUrl("/tarifs"), label: "Tarifs" },
  { href: "/intake", label: "Le diagnostic ADVE gratuit" },
  { href: "/la-guilde", label: "La Guilde" },
] as const;

const FOOTER_LEGAL = [
  { href: "/cgu", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/privacy", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/dpa", label: "DPA" },
  { href: "/sla", label: "SLA" },
  { href: "/trust-center", label: "Trust Center" },
  { href: "/status", label: "Status" },
  { href: "/changelog", label: "Changelog" },
] as const;

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`font-display text-xl font-semibold tracking-tight ${className ?? ""}`}>
      UPgraders<span className="text-coral">·</span>
    </span>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line-soft bg-ink/92 text-bone backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-page items-center gap-6 px-gutter">
        <Link href="/" className="flex shrink-0 items-center" aria-label="UPgraders — accueil">
          <Wordmark />
        </Link>
        <nav
          className="hidden items-center gap-5 text-sm font-medium text-sand xl:flex"
          aria-label="Navigation principale"
        >
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-bone">
              {l.label}
            </Link>
          ))}
          <Link
            href={PRODUCT_ENTRY.href}
            className="inline-flex items-center gap-1 rounded-xs border border-coral/50 px-2.5 py-1 font-semibold text-coral transition-colors hover:border-coral hover:text-coral-hover"
          >
            {PRODUCT_ENTRY.label}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/portails"
            className="hidden text-sm font-medium text-sand transition-colors hover:text-bone md:inline"
          >
            Portails
          </Link>
          <Link
            href="/connexion"
            className="hidden text-sm font-medium text-sand transition-colors hover:text-bone md:inline"
          >
            Connexion
          </Link>
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Diagnostic gratuit
          </Link>
          <MobileNav links={NAV_LINKS} featured={PRODUCT_ENTRY} />
        </div>
      </div>
    </header>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav className="space-y-2 text-sm" aria-label={`Liens ${title}`}>
      <p className="eyebrow text-smoke">{title}</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="transition-colors hover:text-bone">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-ink-0 text-sand">
      <div className="mx-auto max-w-page px-gutter py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Wordmark className="text-bone" />
            <p className="text-sm leading-relaxed">
              {IDENTITY.claim}
              <br />
              {IDENTITY.tagline} Douala · Abidjan.
            </p>
            <ul className="space-y-1.5 pt-2 text-sm">
              <li>
                <a href="mailto:xtincell@gmail.com" className="transition-colors hover:text-bone">
                  xtincell@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/237694171799"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-bone"
                >
                  WhatsApp Douala · +237 694 17 17 99
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/2250546156456"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-bone"
                >
                  WhatsApp Abidjan · +225 05 46 15 64 56
                </a>
              </li>
            </ul>
          </div>
          <FooterColumn title="UPgraders — l'agence" links={FOOTER_AGENCE} />
          <FooterColumn title="La Fusée — le produit" links={FOOTER_PRODUIT} />
          <FooterColumn title="Légal" links={FOOTER_LEGAL} />
        </div>
        <p className="mt-12 border-t border-line-soft pt-6 text-xs text-smoke">
          © {new Date().getFullYear()} UPgraders SARL — La Passion pour Propulseur · RC/DLA/2018/B/1381
        </p>
      </div>
    </footer>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
