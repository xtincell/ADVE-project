import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-background",
        className,
      )}
      style={style}
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background/80 p-5 space-y-4",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Bone className="h-4 w-24" />
          <Bone className="h-8 w-20" />
        </div>
        <Bone className="h-10 w-10 rounded-lg" />
      </div>
      <Bone className="h-3 w-32" />
    </div>
  );
}

export function SkeletonTable({ className, rows = 5 }: SkeletonProps & { rows?: number }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex gap-4 border-b border-border bg-background/60 px-4 py-3">
        {[120, 160, 100, 80, 100].map((w, i) => (
          <Bone key={i} className="h-4" style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-border/50 px-4 py-3 last:border-0"
        >
          {[120, 160, 100, 80, 100].map((w, j) => {
            // Deterministic pseudo-random based on row+col to avoid hydration mismatch
            const seed = ((i * 5 + j + 1) * 7 + 3) % 10;
            const factor = 0.7 + seed * 0.03;
            return <Bone key={j} className="h-4" style={{ width: w * factor }} />;
          })}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ className, items = 4 }: SkeletonProps & { items?: number }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-border bg-background/80 p-4"
        >
          <Bone className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-3/5" />
            <Bone className="h-3 w-2/5" />
          </div>
          <Bone className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <Bone className="h-3 w-40" />
        <Bone className="h-8 w-64" />
        <Bone className="h-4 w-96" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Table */}
      <SkeletonTable />
    </div>
  );
}
