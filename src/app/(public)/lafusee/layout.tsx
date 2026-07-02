import Link from "next/link";

/**
 * Sous-nav PRODUIT (WP-025) — visible sur toutes les pages /lafusee*, sous le
 * header général UPgraders : le contexte La Fusée a sa propre navigation
 * (Aperçu · Tarifs · Diagnostic gratuit · Connexion). Chemins internes : sur
 * l'hôte produit (lafusee.<racine>), le middleware les canonicalise vers les
 * alias courts (/ et /tarifs) — les liens marchent sur tous les hôtes.
 */

const PRODUCT_NAV = [
  { href: "/lafusee", label: "Aperçu" },
  { href: "/lafusee/tarifs", label: "Tarifs" },
  { href: "/intake", label: "Diagnostic gratuit", accent: true },
  { href: "/connexion", label: "Connexion" },
] as const;

export default function LaFuseeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav
        aria-label="Navigation produit La Fusée"
        className="sticky top-16 z-40 border-b border-line-soft bg-ink-0/95 text-bone backdrop-blur-md"
      >
        <div className="mx-auto flex h-12 max-w-page items-center gap-6 overflow-x-auto px-gutter">
          <span className="font-display shrink-0 text-sm font-semibold tracking-tight">
            La Fusée<span className="text-coral">·</span>
            <span className="ml-2 hidden font-sans text-xs font-normal text-smoke-2 sm:inline">
              le produit
            </span>
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-5 text-sm font-medium">
            {PRODUCT_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  "accent" in l && l.accent
                    ? "font-semibold text-coral transition-colors hover:text-coral-hover"
                    : "text-sand transition-colors hover:text-bone"
                }
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
