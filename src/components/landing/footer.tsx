import Link from "next/link";
import { Rocket } from "lucide-react";

const FOOTER_LINKS = {
  Produit: [
    { label: "Diagnostic ADVE", href: "/intake" },
    { label: "Cockpit Marque", href: "/cockpit" },
    { label: "Portail Creator", href: "/creator" },
    { label: "Portail Agence", href: "/agency" },
  ],
  Methode: [
    { label: "Methode ADVERTIS", href: "#score" },
    { label: "Le Trio NETERU", href: "#neteru" },
    { label: "Outils GLORY", href: "#methode" },
    { label: "Score /200", href: "#score" },
  ],
  Entreprise: [
    { label: "A propos", href: "#" },
    { label: "UPgraders", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Carrieres", href: "#" },
  ],
  Legal: [
    { label: "Mentions legales", href: "#" },
    { label: "Confidentialite", href: "#" },
    { label: "CGU", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Top: Logo + columns */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-700">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">La Fusee</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
              L&apos;Industry OS du marche creatif africain.
              De la Poussiere a l&apos;Etoile.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-sm font-semibold text-foreground">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground-muted transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-8 sm:flex-row">
          <p className="text-xs text-foreground-muted">
            &copy; {new Date().getFullYear()} LaFusee SARL. Tous droits reserves.
          </p>
          <p className="text-xs text-foreground-muted">
            Propulse par NETERU &bull; Methode ADVERTIS &bull; UPgraders
          </p>
        </div>
      </div>
    </footer>
  );
}
