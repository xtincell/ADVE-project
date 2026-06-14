/**
 * La Guilde — portail public (ADR-0093). Route relative /LaGuilde.
 * Coque (header + footer) commune à toutes les sous-pages. Route non gardée
 * par proxy.ts (hors matcher) → publique par défaut.
 */

import type { Metadata } from "next";
import { GuildShell } from "@/components/laguilde/guild-shell";

export const metadata: Metadata = {
  title: "La Guilde — Missions créatives | La Fusée",
  description:
    "Le marketplace créatif de La Fusée : les marques publient leurs missions, les freelances et agences de prod candidatent. Afrique francophone.",
};

export default function LaGuildeLayout({ children }: { children: React.ReactNode }) {
  return <GuildShell>{children}</GuildShell>;
}
