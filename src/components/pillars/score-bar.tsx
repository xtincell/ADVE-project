import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/components/ui/cn";

/** Barre de score déterministe — jamais de valeur hors bornes affichée. */
const scoreBarVariants = cva("w-full overflow-hidden rounded-xs", {
  variants: {
    tone: {
      dark: "bg-white/10",
      light: "bg-ink/10",
    },
    size: {
      sm: "h-1.5",
      md: "h-2.5",
    },
  },
  defaultVariants: { tone: "dark", size: "md" },
});

export type ScoreBarProps = VariantProps<typeof scoreBarVariants> & {
  value: number;
  max: number;
  label?: string;
  className?: string;
};

export function ScoreBar({ value, max, label, tone, size, className }: ScoreBarProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value * 10) / 10}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn(scoreBarVariants({ tone, size }), className)}
    >
      <div
        className="h-full rounded-xs bg-coral transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
