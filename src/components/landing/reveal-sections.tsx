"use client";

/**
 * Orchestration scroll-reveal des sections landing (audit DS 2026-07-19) —
 * le hook `useScrollReveal` existait sans AUCUN consommateur pendant que
 * /lafusee empilait ses sections sans mouvement. Chaque enfant direct est
 * enveloppé d'un conteneur `data-reveal` (slide-up, reduced-motion respecté
 * par le hook lui-même).
 */

import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export function RevealSections({ children }: { children: React.ReactNode[] }) {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref}>
      {children.map((child, i) => (
        <div key={i} data-reveal="slide-up">
          {child}
        </div>
      ))}
    </div>
  );
}
