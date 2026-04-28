"use client";

interface Props {
  variant?: "card" | "list" | "oracle";
  className?: string;
}

/**
 * <NeteruSkeleton> — standard shimmer for any tRPC query that may take
 * >300ms. Banishes white screens during cold loads and migrations.
 */
export function NeteruSkeleton({ variant = "card", className = "" }: Props) {
  if (variant === "oracle") {
    return (
      <div className={`neteru-skeleton-oracle space-y-3 ${className}`}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-3 w-full animate-pulse rounded bg-current/10" />
        ))}
      </div>
    );
  }
  if (variant === "list") {
    return (
      <ul className={`neteru-skeleton-list space-y-2 ${className}`}>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="h-6 w-full animate-pulse rounded bg-current/10" />
        ))}
      </ul>
    );
  }
  return (
    <div
      className={`neteru-skeleton-card h-32 w-full animate-pulse rounded-lg bg-current/10 ${className}`}
    />
  );
}
