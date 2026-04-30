"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Popover({ trigger, children, side = "bottom", align = "start", open: openProp, onOpenChange, className }: PopoverProps) {
  const [openInternal, setOpenInternal] = React.useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenInternal(next);
    onOpenChange?.(next);
  };
  const containerRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sidePos = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2 top-0",
    right: "left-full ml-2 top-0",
  }[side];
  const alignPos =
    side === "top" || side === "bottom"
      ? align === "start" ? "left-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-0"
      : "";

  const triggerWithToggle = React.cloneElement(trigger as React.ReactElement<any>, {
    onClick: (e: React.MouseEvent) => {
      (trigger.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
      setOpen(!open);
    },
    "aria-expanded": open,
    "aria-haspopup": "dialog",
  });

  return (
    <span ref={containerRef} className="relative inline-block">
      {triggerWithToggle}
      {open && (
        <div
          role="dialog"
          className={cn(
            "absolute z-[var(--z-popover)]",
            "bg-[var(--popover-bg)] border border-[var(--popover-border)] shadow-[var(--popover-shadow)]",
            "rounded-[var(--popover-radius)] p-[var(--popover-p)]",
            sidePos,
            alignPos,
            className,
          )}
        >
          {children}
        </div>
      )}
    </span>
  );
}
