import { Badge } from "@/components/ui/badge";
import { LEVEL_DEFINITIONS } from "@/domain/scoring";
import type { BrandLevel } from "@/domain/pillars";

/**
 * Badge de palier — mapping canon : paliers bas en neutre inversé (sombre),
 * FORTE en corail, CULTE/ICONE en or (l'or reste homéopathique).
 */
const LEVEL_VARIANTS: Record<BrandLevel, "inverse" | "coral" | "gold"> = {
  LATENT: "inverse",
  FRAGILE: "inverse",
  ORDINAIRE: "inverse",
  FORTE: "coral",
  CULTE: "gold",
  ICONE: "gold",
};

export type LevelBadgeProps = { level: BrandLevel; className?: string };

export function LevelBadge({ level, className }: LevelBadgeProps) {
  return (
    <Badge variant={LEVEL_VARIANTS[level]} className={className}>
      {LEVEL_DEFINITIONS[level].label}
    </Badge>
  );
}
