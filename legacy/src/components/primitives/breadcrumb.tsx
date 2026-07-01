"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

export function Breadcrumb({ items, separator = "/", className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Fil d'Ariane" className={cn("flex items-center gap-1 text-sm", className)} {...props}>
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true" className="text-[var(--color-foreground-muted)]">{separator}</span>}
              {item.href && !isLast ? (
                <a href={item.href} className="text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)]">
                  {item.label}
                </a>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-[var(--color-foreground)] font-medium" : "text-[var(--color-foreground-secondary)]"}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
