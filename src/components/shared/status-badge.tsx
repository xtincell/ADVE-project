import { cn } from "@/lib/utils";

type VariantMap = Record<string, string>;

interface StatusBadgeProps {
  status: string;
  variantMap?: VariantMap;
  className?: string;
}

const DEFAULT_VARIANTS: VariantMap = {
  active: "bg-success/15 text-success ring-success",
  completed: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  pending: "bg-warning/15 text-warning ring-warning",
  draft: "bg-surface-raised text-foreground-secondary ring-border/30",
  cancelled: "bg-error/15 text-error ring-error",
  paused: "bg-orange-400/15 text-orange-400 ring-orange-400/30",
  in_progress: "bg-accent/15 text-accent ring-accent/30",
  review: "bg-sky-400/15 text-sky-400 ring-sky-400/30",
};

const FALLBACK = "bg-surface-raised text-foreground-secondary ring-border/30";

export function StatusBadge({
  status,
  variantMap,
  className,
}: StatusBadgeProps) {
  const variants = variantMap ?? DEFAULT_VARIANTS;
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  const colors = variants[normalized] ?? FALLBACK;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        colors,
        className,
      )}
    >
      {status}
    </span>
  );
}
