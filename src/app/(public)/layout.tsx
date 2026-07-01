import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * Shell public — header + footer partagés par la landing, /tarifs, l'intake
 * et les pages légales. Chrome sobre : logo texte, nav, CTA diagnostic.
 * /guilde et /connexion arrivent aux WP-011 / WP-003 — liens posés d'avance.
 */

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/guilde", label: "La Guilde" },
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
      <div className="mx-auto flex h-16 max-w-page items-center gap-8 px-gutter">
        <Link href="/" className="flex items-center" aria-label="La Fusée — accueil">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-sand sm:flex" aria-label="Navigation principale">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-bone">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/connexion"
            className="text-sm font-medium text-sand transition-colors hover:text-bone"
          >
            Connexion
          </Link>
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Diagnostic gratuit
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-ink-0 text-sand">
      <div className="mx-auto max-w-page px-gutter py-14">
        <div className="grid gap-10 sm:grid-cols-3">
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
              Douala, Cameroun.
            </p>
          </div>
          <nav className="space-y-2 text-sm" aria-label="Liens produit">
            <p className="eyebrow text-smoke">Produit</p>
            <ul className="space-y-2">
              <li><Link href="/intake" className="hover:text-bone">Le diagnostic ADVE</Link></li>
              <li><Link href="/tarifs" className="hover:text-bone">Tarifs</Link></li>
              <li><Link href="/guilde" className="hover:text-bone">La Guilde</Link></li>
            </ul>
          </nav>
          <nav className="space-y-2 text-sm" aria-label="Contact et légal">
            <p className="eyebrow text-smoke">Contact</p>
            <ul className="space-y-2">
              <li>
                <a href="mailto:bonjour@upgraders.pro" className="hover:text-bone">
                  bonjour@upgraders.pro
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/237694171799"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-bone"
                >
                  WhatsApp · +237 694 17 17 99
                </a>
              </li>
              <li><Link href="/mentions-legales" className="hover:text-bone">Mentions légales</Link></li>
            </ul>
          </nav>
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
