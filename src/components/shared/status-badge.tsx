import { cn } from "@/lib/utils";

type VariantMap = Record<string, string>;

interface StatusBadgeProps {
  status: string;
  variantMap?: VariantMap;
  className?: string;
}

const DEFAULT_VARIANTS: VariantMap = {
  active: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  completed: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  pending: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  draft: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
  cancelled: "bg-red-400/15 text-red-400 ring-red-400/30",
  paused: "bg-orange-400/15 text-orange-400 ring-orange-400/30",
  in_progress: "bg-violet-400/15 text-violet-400 ring-violet-400/30",
  review: "bg-sky-400/15 text-sky-400 ring-sky-400/30",
};

const FALLBACK = "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30";

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
