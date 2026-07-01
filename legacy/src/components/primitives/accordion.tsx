"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AccordionItemProps {
  value: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col", className)} {...props}>{children}</div>;
}

export function AccordionItem({ value: _value, trigger, children, defaultOpen = false }: AccordionItemProps) {
  return (
    <details
      open={defaultOpen}
      className="group border-t border-[var(--color-border)] last:border-b open:bg-[var(--color-surface-raised)]/30"
    >
      <summary className="flex items-center justify-between gap-4 cursor-pointer py-4 px-4 list-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-[var(--color-foreground)]">{trigger}</span>
        <span className="text-[var(--color-accent)] text-xl group-open:rotate-45 transition-transform">+</span>
      </summary>
      <div className="px-4 pb-4 text-sm text-[var(--color-foreground-secondary)]">{children}</div>
    </details>
  );
}
