"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface SearchFilterProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  className?: string;
}

export function SearchFilter({
  placeholder = "Rechercher...",
  value,
  onChange,
  filters,
  filterValues = {},
  onFilterChange,
  className,
}: SearchFilterProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-border-strong focus:ring-1 focus:ring-border"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      {filters?.map((filter) => (
        <select
          key={filter.key}
          value={filterValues[filter.key] ?? ""}
          onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground-secondary outline-none transition-colors focus:border-border-strong focus:ring-1 focus:ring-border"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
