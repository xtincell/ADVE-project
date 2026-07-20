"use client";

/**
 * BrandAccentVars — le cockpit aux couleurs de la marque (ADR-0130).
 *
 * Quand la marque active possède une palette déclarée (actif
 * CHROMATIC_STRATEGY du coffre — ex. le bleu digital officiel du brand book
 * Motion19), l'accent System du portail cockpit est rebindé sur cette couleur
 * le temps de la session : `--accent` + `--accent-fill`. Tout le chrome qui
 * consomme les tokens (boutons, chips, cartes identité/northstar, liens)
 * reflète la marque — sans une seule couleur en dur dans un composant
 * (les valeurs viennent de la DONNÉE, la cascade de tokens reste intacte).
 *
 * Honnête et réversible : pas de palette → aucun effet (thème UPgraders) ;
 * navigation hors cockpit → cleanup. Les hex sont validés côté serveur
 * (getBrandIdentity) avant d'arriver ici.
 */

import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useStrategy } from "@/components/cockpit/strategy-context";

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Garde-fou contraste (ADR-0130 §Conséquences, RESIDUAL-DEBT) : l'accent vient
 * du brand book du client — un accent trop sombre est illisible sur le fond
 * sombre du cockpit (liens/boutons invisibles). Luminance relative WCAG ;
 * sous le seuil, on NE REBINDE PAS (fallback = corail canon du DS).
 */
function isReadableAccent(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * toLin((n >> 16) & 0xff) + 0.7152 * toLin((n >> 8) & 0xff) + 0.0722 * toLin(n & 0xff);
  // Contraste vs fond sombre (~L 0.01) : (L+0.05)/(0.06) ≥ ~2.3 → L ≥ 0.09.
  return luminance >= 0.09;
}

export function BrandAccentVars() {
  const { strategyId } = useStrategy();
  const identityQuery = trpc.cockpitDashboard.getBrandIdentity.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId, staleTime: 5 * 60_000 },
  );

  const accent = identityQuery.data?.palette?.accent ?? null;

  useEffect(() => {
    if (!accent || !HEX.test(accent) || !isReadableAccent(accent)) return;
    const root = document.documentElement;
    const prevAccent = root.style.getPropertyValue("--accent");
    const prevFill = root.style.getPropertyValue("--accent-fill");
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-fill", `color-mix(in oklab, ${accent} 14%, transparent)`);
    return () => {
      if (prevAccent) root.style.setProperty("--accent", prevAccent);
      else root.style.removeProperty("--accent");
      if (prevFill) root.style.setProperty("--accent-fill", prevFill);
      else root.style.removeProperty("--accent-fill");
    };
  }, [accent]);

  return null;
}
