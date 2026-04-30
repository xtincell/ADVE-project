"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const sheetVariants = cva(
  "fixed bg-[var(--sheet-bg)] border-[var(--sheet-border)] shadow-[var(--sheet-shadow)] z-[var(--z-modal)] flex flex-col",
  {
    variants: {
      side: {
        right: "top-0 right-0 h-screen border-l",
        left: "top-0 left-0 h-screen border-r",
        top: "top-0 left-0 right-0 border-b",
        bottom: "bottom-0 left-0 right-0 border-t",
      },
      size: {
        sm: "",
        md: "",
        lg: "",
      },
    },
    compoundVariants: [
      { side: "right", size: "sm", class: "w-[var(--sheet-w-sm)]" },
      { side: "right", size: "md", class: "w-[var(--sheet-w-md)]" },
      { side: "right", size: "lg", class: "w-[var(--sheet-w-lg)]" },
      { side: "left", size: "sm", class: "w-[var(--sheet-w-sm)]" },
      { side: "left", size: "md", class: "w-[var(--sheet-w-md)]" },
      { side: "left", size: "lg", class: "w-[var(--sheet-w-lg)]" },
      { side: "top", size: "sm", class: "h-[40vh]" },
      { side: "top", size: "md", class: "h-[60vh]" },
      { side: "top", size: "lg", class: "h-[80vh]" },
      { side: "bottom", size: "sm", class: "h-[40vh]" },
      { side: "bottom", size: "md", class: "h-[60vh]" },
      { side: "bottom", size: "lg", class: "h-[80vh]" },
    ],
    defaultVariants: { side: "right", size: "md" },
  },
);

export interface SheetProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sheetVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
  title?: React.ReactNode;
}

export function Sheet({ open, onOpenChange, modal = true, title, side, size, className, children, ...props }: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", onKey);
    if (modal) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (modal) document.body.style.overflow = "";
    };
  }, [open, modal, onOpenChange]);

  if (!open) return null;
  return (
    <>
      {modal && <div className="fixed inset-0 bg-[var(--modal-backdrop)] z-[var(--z-modal-backdrop)]" onClick={() => onOpenChange(false)} aria-hidden="true" />}
      <div role="dialog" aria-modal={modal} className={cn(sheetVariants({ side, size }), className)} {...props}>
        {title && (
          <header className="px-6 py-4 border-b border-[var(--color-border)] font-semibold">{title}</header>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
}
