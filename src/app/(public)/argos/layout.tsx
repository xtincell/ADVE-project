/**
 * Argos by LaFusée — propriété éditoriale publique (ADR-0083 + ADR-0100).
 * Route relative /argos (hors matcher proxy.ts → publique). Sous-marque sœur.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Radar } from "lucide-react";

export const metadata: Metadata = {
  title: "Argos by LaFusée — Références créatives",
  description:
    "Argos : la bibliothèque de dossiers de référence créatifs (DNA de marque, codes, axes culturels) du marché africain francophone, par La Fusée.",
};

export default function ArgosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[var(--z-topbar)] border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[var(--maxw-content)] items-center justify-between px-[var(--pad-page)]">
          <Link href="/argos" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Radar className="h-4 w-4" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight text-foreground">Argos</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">par La Fusée</span>
            </span>
          </Link>
          <Link href="/" className="text-sm font-medium text-foreground-secondary hover:text-foreground">
            La Fusée
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-8 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Argos by LaFusée</span> — propriété
          éditoriale sœur de La Fusée. Dossiers de référence à visée d'inspiration créative.
        </div>
      </footer>
    </div>
  );
}
