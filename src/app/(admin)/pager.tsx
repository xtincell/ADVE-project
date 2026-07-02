import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE } from "@/server/admin";

/**
 * Pagination console simple (take/skip) — liens GET qui préservent les
 * filtres courants. Rien à paginer (une seule page) → ne rend rien.
 */
export function Pager({
  pathname,
  params,
  page,
  total,
  pageSize = PAGE_SIZE,
}: {
  pathname: string;
  /** Filtres à préserver dans les liens (sans `page`). */
  params: Record<string, string | undefined>;
  page: number;
  total: number;
  pageSize?: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
      <p className="text-smoke">
        {from}–{to} sur {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="inline-flex h-8 items-center gap-1 rounded-sm px-3 text-xs font-semibold text-graphite transition-colors hover:bg-ink/5"
          >
            <ChevronLeft className="size-3.5" aria-hidden /> Précédent
          </Link>
        ) : null}
        <span className="font-mono text-xs text-smoke-2">
          page {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            href={href(page + 1)}
            className="inline-flex h-8 items-center gap-1 rounded-sm px-3 text-xs font-semibold text-graphite transition-colors hover:bg-ink/5"
          >
            Suivant <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
