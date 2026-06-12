/**
 * Shell partagé des pages légales publiques (Vague 6 — conformité B2B).
 * Même langage visuel que /privacy : sobre, lisible, imprimable.
 */
import Link from "next/link";
import type { ReactNode } from "react";

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
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="font-mono text-xs text-foreground-muted hover:text-accent">
          ← Retour
        </Link>
        <nav className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
          <Link href="/mentions-legales" className="hover:text-accent">Mentions</Link>
          <Link href="/cgu" className="hover:text-accent">CGU</Link>
          <Link href="/cgv" className="hover:text-accent">CGV</Link>
          <Link href="/sla" className="hover:text-accent">SLA</Link>
          <Link href="/privacy" className="hover:text-accent">Privacy</Link>
          <Link href="/dpa" className="hover:text-accent">DPA</Link>
          <Link href="/trust-center" className="hover:text-accent">Trust</Link>
        </nav>
      </div>
      <h1 className="mb-4 font-display text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mb-10 text-foreground-secondary">
        Mise à jour : {updated}. {intro}
      </p>
      <div className="space-y-8 text-foreground-secondary">{children}</div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-2.5 [&_li]:ml-0 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">{children}</div>
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
              <th key={h} className="border border-border bg-bg-subtle px-3 py-2 text-left font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="border border-border px-3 py-2 align-top">
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
