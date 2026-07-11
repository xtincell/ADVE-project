/**
 * Segment opérateur du Cockpit — gardé par <OperatorSurface> (audit UX
 * 2026-07-11, lot 12). Un founder reçoit un écran « pris en charge par
 * votre équipe » ; la surface reste joignable pour ADMIN / opérateurs.
 */
import { OperatorSurface } from "@/components/cockpit/operator-surface";

export default function OperatorSegmentLayout({ children }: { children: React.ReactNode }) {
  return <OperatorSurface>{children}</OperatorSurface>;
}
