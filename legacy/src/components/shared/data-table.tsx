"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  sortFn?: (a: T, b: T) => number;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  pageSize?: number;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  onRowClick?: (item: T) => void;
  stickyHeader?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  className,
  emptyMessage = "Aucune donn\u00e9e",
  emptyIcon,
  pageSize,
  selectable = false,
  onSelectionChange,
  onRowClick,
  stickyHeader = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Sorting
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((prev) =>
          prev === "asc" ? "desc" : prev === "desc" ? null : "asc",
        );
        if (sortDir === "desc") setSortKey(null);
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setCurrentPage(0);
    },
    [sortKey, sortDir],
  );

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;

    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;

    const sorted = [...data].sort((a, b) => {
      if (col.sortFn) return col.sortFn(a, b);

      const aVal = a[col.key];
      const bVal = b[col.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal - bVal;
      }
      return String(aVal).localeCompare(String(bVal), "fr");
    });

    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [data, sortKey, sortDir, columns]);

  // Pagination
  const isPaginated = pageSize != null && pageSize > 0;
  const totalPages = isPaginated ? Math.ceil(sortedData.length / pageSize) : 1;
  const paginatedData = isPaginated
    ? sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    : sortedData;

  // Selection
  const toggleRow = useCallback(
    (index: number) => {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        onSelectionChange?.(
          [...next].map((i) => sortedData[i]).filter((v): v is T => v != null),
        );
        return next;
      });
    },
    [sortedData, onSelectionChange],
  );

  const toggleAll = useCallback(() => {
    if (selectedRows.size === sortedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const all = new Set(sortedData.map((_, i) => i));
      setSelectedRows(all);
      onSelectionChange?.([...sortedData]);
    }
  }, [sortedData, selectedRows.size, onSelectionChange]);

  const allSelected =
    sortedData.length > 0 && selectedRows.size === sortedData.length;

  // Empty state
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 p-12 text-center",
          className,
        )}
      >
        {emptyIcon ?? (
          <div className="rounded-full bg-background/80 p-3">
            <Inbox className="h-6 w-6 text-foreground-muted" />
          </div>
        )}
        <p className="mt-3 text-sm text-foreground-secondary">{emptyMessage}</p>
      </div>
    );
  }

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey)
      return <ArrowUpDown className="h-3.5 w-3.5 text-foreground-muted" />;
    if (sortDir === "asc")
      return <ArrowUp className="h-3.5 w-3.5 text-foreground-secondary" />;
    return <ArrowDown className="h-3.5 w-3.5 text-foreground-secondary" />;
  };

  return (
    <div className={cn("space-y-0", className)}>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr
              className={cn(
                "border-b border-border bg-background/60",
                stickyHeader && "sticky top-0 z-10",
              )}
            >
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border-strong bg-background text-white accent-white"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted",
                    col.sortable !== false &&
                      "cursor-pointer select-none hover:text-foreground-secondary",
                    col.className,
                  )}
                  onClick={
                    col.sortable !== false
                      ? () => handleSort(col.key)
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable !== false && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, i) => {
              const globalIndex = isPaginated ? currentPage * pageSize + i : i;
              return (
                <tr
                  key={globalIndex}
                  onClick={
                    onRowClick ? () => onRowClick(item) : undefined
                  }
                  className={cn(
                    "border-b border-border/50 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer",
                    selectedRows.has(globalIndex)
                      ? "bg-background/60"
                      : "hover:bg-background/30",
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(globalIndex)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleRow(globalIndex);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border-strong bg-background text-white accent-white"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-4 py-3 text-foreground-secondary", col.className)}
                    >
                      {col.render
                        ? col.render(item)
                        : String(item[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {isPaginated && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-foreground-muted">
            {currentPage * pageSize + 1}-
            {Math.min((currentPage + 1) * pageSize, sortedData.length)} sur{" "}
            {sortedData.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-md p-1.5 text-foreground-secondary transition-colors hover:bg-background hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={cn(
                  "h-7 min-w-[1.75rem] rounded-md px-2 text-xs font-medium transition-colors",
                  p === currentPage
                    ? "bg-surface-raised text-white"
                    : "text-foreground-muted hover:bg-background hover:text-white",
                )}
              >
                {p + 1}
              </button>
            ))}
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={currentPage === totalPages - 1}
              className="rounded-md p-1.5 text-foreground-secondary transition-colors hover:bg-background hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
