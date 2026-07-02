import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shell partagé des pages légales & trust publiques — porté du legacy
 * (legacy/src/components/legal/legal-shell.tsx) sur les tokens UPgraders v7.
 * Sobre, lisible, imprimable : colonne de lecture, nav croisée entre pages
 * légales, sections ancrées (#slug) pour citation d'article.
 */

const LEGAL_NAV = [
  { href: "/mentions-legales", label: "Mentions" },
  { href: "/cgu", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/sla", label: "SLA" },
  { href: "/privacy", label: "Confidentialité" },
  { href: "/dpa", label: "DPA" },
  { href: "/trust-center", label: "Trust Center" },
] as const;

/** Slug d'ancre déterministe depuis un titre de section (accents retirés). */
export function anchorId(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-bone">
      <article className="mx-auto max-w-3xl px-gutter py-16 sm:py-20">
        <nav
          aria-label="Pages légales"
          className="mb-10 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-smoke"
        >
          {LEGAL_NAV.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-coral">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="eyebrow text-coral">Légal &amp; confiance</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-2 font-mono text-xs text-smoke">Mise à jour : {updated}</p>
        <div className="mt-6 leading-relaxed text-graphite [&_a]:font-medium [&_a]:text-coral [&_a:hover]:underline [&_strong]:text-ink">
          {intro}
        </div>

        <div className="mt-12 space-y-10">{children}</div>
      </article>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  const id = anchorId(title);
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display mb-3 text-xl font-semibold text-ink">
        <a href={`#${id}`} className="transition-colors hover:text-coral">
          {title}
        </a>
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-graphite [&_a]:font-medium [&_a]:text-coral [&_a:hover]:underline [&_li]:ml-0 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function LegalTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border border-ink/15 bg-bone-2 px-3 py-2 text-left font-semibold text-ink"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="border border-ink/10 px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
