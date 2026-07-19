/**
 * /landingintake → /lafusee (308) — façade unique V2 (2026-07-19).
 *
 * La 3ᵉ landing (handoff .lf « La Fusée by UPgraders », juin 2026) doublait
 * /lafusee avec un design et une copy divergents — c'était ELLE qui cassait la
 * logique de la façade. Sa seule valeur unique — le mini-funnel 3 champs +
 * méthode → /intake pré-rempli avec capture CRM — vit désormais sur /lafusee
 * (`<DiagnosticCta/>`, hero). Le token bridge `.lf` (landingintake.css) reste
 * vivant : il stylise le mini-funnel porté.
 */
import { permanentRedirect } from "next/navigation";

export default function LandingIntakeRedirect() {
  permanentRedirect("/lafusee");
}
