import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { MobileNav } from "@/components/marketing/mobile-nav";

/**
 * Shell public — header + footer du site de marque (landing, pages agence,
 * blog, tarifs, intake, légal). Nav complète ≥ xl, burger en dessous
 * (zéro dépendance). Le footer porte les trois colonnes produit / agence /
 * légal — les pages légales sont livrées par le WP conformité.
 */

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/lafusee", label: "La Fusée" },
  { href: "/methode", label: "Méthode" },
  { href: "/services", label: "Services" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/blog", label: "Blog" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/la-guilde", label: "La Guilde" },
  { href: "/contact", label: "Contact" },
] as const;

const FOOTER_PRODUIT = [
  { href: "/lafusee", label: "La Fusée — le produit" },
  { href: "/intake", label: "Le diagnostic ADVE gratuit" },
  { href: "/intake/score", label: "Le score de marque /200" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/la-guilde", label: "La Guilde" },
  { href: "/portails", label: "Portails" },
  { href: "/connexion", label: "Connexion" },
] as const;

const FOOTER_AGENCE = [
  { href: "/agence", label: "Qui sommes-nous" },
  { href: "/methode", label: "La méthode ADVE/RTIS" },
  { href: "/services", label: "Services" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
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
      La Fusée<span className="text-coral">·</span>
    </span>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line-soft bg-ink/92 text-bone backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-page items-center gap-6 px-gutter">
        <Link href="/" className="flex shrink-0 items-center" aria-label="La Fusée — accueil">
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
          <MobileNav links={NAV_LINKS} />
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
              L&apos;OS de marque d&apos;Afrique francophone, par{" "}
              <a
                href="https://www.upgraders.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-bone hover:text-coral"
              >
                UPgraders
              </a>
              .<br />
              La passion pour propulseur · Douala, Cameroun.
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
          <FooterColumn title="Produit" links={FOOTER_PRODUIT} />
          <FooterColumn title="Agence" links={FOOTER_AGENCE} />
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
