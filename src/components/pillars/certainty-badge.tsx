import { cva } from "class-variance-authority";
import { cn } from "@/components/ui/cn";
import type { FieldCertaintyStatus } from "./certainty";

/**
 * Badge de certitude d'un champ (doctrine needsHuman) — sur surface sombre :
 *   DECLARED → vert (validé humain) · INFERRED → corail « à valider »
 *   filled → neutre (provenance non marquée) · empty → contour discret.
 */
const certaintyBadgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
  {
    variants: {
      status: {
        declared: "bg-success/15 text-success",
        inferred: "bg-coral/15 text-coral",
        filled: "bg-white/10 text-sand",
        empty: "border border-line bg-transparent text-smoke-2",
      },
    },
  },
);

const STATUS_LABELS: Record<FieldCertaintyStatus, string> = {
  declared: "Déclaré",
  inferred: "À valider",
  filled: "Rempli",
  empty: "Vide",
};

export type CertaintyBadgeProps = {
  status: FieldCertaintyStatus;
  className?: string;
};

export function CertaintyBadge({ status, className }: CertaintyBadgeProps) {
  return (
    <span className={cn(certaintyBadgeVariants({ status }), className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}
