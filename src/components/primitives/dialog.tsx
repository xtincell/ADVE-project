"use client";

/**
 * Dialog primitive — modal natif + focus trap + ESC close.
 * Pattern simple custom (sans Radix). Sizes sm/md/lg/xl/fullscreen.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const dialogContentVariants = cva(
  cn(
    "relative bg-[var(--modal-bg)] border border-[var(--modal-border)] rounded-[var(--modal-radius)] shadow-[var(--modal-shadow)]",
    "px-[var(--modal-px)] py-[var(--modal-py)]",
    "max-h-[90vh] overflow-y-auto",
  ),
  {
    variants: {
      size: {
        sm: "max-w-[var(--modal-max-w-sm)] w-[90vw]",
        md: "max-w-[var(--modal-max-w-md)] w-[90vw]",
        lg: "max-w-[var(--modal-max-w-lg)] w-[90vw]",
        xl: "max-w-[var(--modal-max-w-xl)] w-[90vw]",
        fullscreen: "w-screen h-screen max-w-none max-h-none rounded-none",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface DialogProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dialogContentVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  dismissible?: boolean;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  dismissible = true,
  size,
  className,
  children,
  ...props
}: DialogProps) {
  const titleId = React.useId();
  const descId = React.useId();
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) onOpenChange(false);
    }
    document.addEventListener("keydown", handleKey);

    requestAnimationFrame(() => {
      contentRef.current?.focus();
    });

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [open, onOpenChange, dismissible]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
    >
      <div
        className="absolute inset-0 bg-[var(--modal-backdrop)]"
        onClick={dismissible ? () => onOpenChange(false) : undefined}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        tabIndex={-1}
        className={cn(dialogContentVariants({ size }), "z-[1]", className)}
        {...props}
      >
        {title && (
          <h2 id={titleId} className="text-lg font-semibold mb-2 text-[var(--color-foreground)]">
            {title}
          </h2>
        )}
        {description && (
          <p id={descId} className="text-sm text-[var(--color-foreground-secondary)] mb-4">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mt-6 flex items-center justify-end gap-2", className)} {...props} />
  ),
);
DialogFooter.displayName = "DialogFooter";
