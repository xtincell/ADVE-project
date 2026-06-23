/**
 * <ProductCatalog> — la gamme UPgraders sur /tarifs.
 *
 * Set produit PROPRE à l'agence : le produit self-serve La Fusée (renvoie vers
 * SON univers de prix /pricing) + les prestations agence sur devis. Server
 * component statique — aucune grille FCFA dupliquée ici (cf. data.ts PRODUCTS).
 * Tokens DS sémantiques uniquement ; carte « featured » en fond foreground
 * (inline style), à l'identique de <PricingGrid>.
 */
import Link from "next/link";
import { PRODUCTS } from "./data";

export function ProductCatalog() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {PRODUCTS.map((p) => {
        const featured = !!p.featured;
        return (
          <article
            key={p.mark}
            className={`relative flex min-h-[420px] flex-col gap-5 p-8 ${featured ? "" : "border border-border bg-background"}`}
            style={featured ? { background: "var(--color-foreground)", color: "var(--color-background)" } : undefined}
          >
            {p.badge && (
              <span className="absolute -top-3 left-8 bg-accent px-2.5 py-1 font-mono text-2xs uppercase tracking-widest text-accent-foreground">
                {p.badge}
              </span>
            )}

            <header className="flex flex-col gap-1.5">
              <span className="font-mono text-2xs uppercase tracking-widest text-accent">{p.kind}</span>
              <h3 className="font-display text-3xl font-semibold tracking-tight">
                {p.name}
                {p.emphasis ? <span className="font-serif italic font-medium text-accent"> {p.emphasis}</span> : null}
              </h3>
              <p className="text-sm opacity-75">{p.tagline}</p>
            </header>

            <div className="flex flex-col gap-1">
              <span className="font-display text-2xl font-semibold">{p.priceLabel}</span>
              <span className="text-xs opacity-70">{p.priceNote}</span>
            </div>

            <ul className="flex flex-1 flex-col gap-2 text-sm">
              {p.inclusions.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span className="opacity-85">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-wrap gap-3">
              <Link
                href={p.primaryCta.href}
                className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-[12px] uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                {p.primaryCta.label} →
              </Link>
              {p.secondaryCta && (
                <Link
                  href={p.secondaryCta.href}
                  className="inline-flex items-center gap-2 border px-5 py-3 font-mono text-[12px] uppercase tracking-widest transition-opacity hover:opacity-80"
                  style={{
                    borderColor: featured
                      ? "color-mix(in oklab, var(--color-background) 45%, transparent)"
                      : "color-mix(in oklab, var(--color-foreground) 22%, transparent)",
                  }}
                >
                  {p.secondaryCta.label}
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
