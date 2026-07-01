"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="px-3 py-1 text-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ‹
      </button>
      <span className="px-3 py-1 text-sm text-[var(--color-foreground-secondary)]" aria-current="page">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="px-3 py-1 text-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </nav>
  );
}
