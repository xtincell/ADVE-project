"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
  delayMs?: number;
  /**
   * Quand true, le tooltip wrap son contenu (whitespace-normal) au lieu du
   * comportement par défaut single-line (whitespace-nowrap). Utile pour des
   * descriptions explicatives (>40 chars) qui tiendraient pas sur une ligne.
   */
  multiline?: boolean;
}

export function Tooltip({ content, side = "top", children, delayMs = 200, multiline = false }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delayMs);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  const trigger = React.cloneElement(children as React.ReactElement<any>, {
    "aria-describedby": open ? id : undefined,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });

  const sidePosition = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  }[side];

  return (
    <span className="relative inline-block">
      {trigger}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "absolute z-[var(--z-popover)] pointer-events-none",
            multiline ? "whitespace-normal break-words" : "whitespace-nowrap",
            "bg-[var(--tooltip-bg)] text-[var(--tooltip-fg)] border border-[var(--tooltip-border)] shadow-[var(--tooltip-shadow)]",
            "rounded-[var(--tooltip-radius)] px-[var(--tooltip-px)] py-[var(--tooltip-py)] text-xs max-w-[var(--tooltip-max-w)]",
            sidePosition,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
