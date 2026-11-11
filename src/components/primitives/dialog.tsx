"use client";

/**
 * Dialog primitive — modal natif + focus trap + ESC close.
 * Pattern simple custom (sans Radix). Sizes sm/md/lg/xl/fullscreen.
 *
 * `blocking={false}` — pour un dialogue qui s'ouvre DE LUI-MÊME (note de version,
 * accueil), pas en réponse à un geste. Un tel dialogue apparaît après l'hydratation,
 * donc quand la page est déjà visible et cliquable : en modal bloquant, il captait le
 * premier geste visé sur la page (F13, 2026-11-11 : premier clic « Sources » perdu
 * après rechargement, le clic fermait la note au lieu de naviguer). Non bloquant, il
 * ne capte aucun geste destiné à la page : le fond laisse passer les pointeurs, une
 * pression hors du contenu le referme (comme le Popover) et le clic atteint sa cible ;
 * il ne prend pas le focus et ne verrouille pas le défilement.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";

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
      // Non bloquant : seul le contenu reçoit les pointeurs (la racine les laisse passer).
      blocking: { true: "", false: "pointer-events-auto" },
    },
    defaultVariants: { size: "md", blocking: true },
  },
);

export const dialogRootVariants = cva("fixed inset-0 z-[var(--z-modal)] flex items-center justify-center", {
  variants: {
    // Non bloquant : la racine et le fond laissent passer les pointeurs vers la page.
    blocking: { true: "", false: "pointer-events-none" },
  },
  defaultVariants: { blocking: true },
});

export interface DialogProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
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
  blocking,
  className,
  children,
  ...props
}: DialogProps) {
  const titleId = React.useId();
  const descId = React.useId();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const isBlocking = blocking !== false;
  // Event handlers may change on every keystroke. Focus belongs to the open
  // lifecycle, not to the identity of the parent's inline callback.
  const handleEscape = React.useEffectEvent(() => {
    if (dismissible) onOpenChange(false);
  });
  // Non bloquant : une pression hors du contenu referme le dialogue, SANS être
  // consommée — l'évènement poursuit sa route vers l'élément visé de la page.
  const handleOutsidePointer = React.useEffectEvent((event: PointerEvent) => {
    if (!dismissible) return;
    if (event.target instanceof Node && contentRef.current?.contains(event.target)) return;
    onOpenChange(false);
  });

  React.useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    // Verrou de scroll REF-COMPTÉ (audit 2026-07-22) — plusieurs modaux empilés ne
    // laissent plus le body bloqué `overflow:hidden` après fermeture.
    if (isBlocking) lockBodyScroll();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleEscape();
    }
    document.addEventListener("keydown", handleKey);
    function handlePointer(e: PointerEvent) {
      handleOutsidePointer(e);
    }
    if (!isBlocking) document.addEventListener("pointerdown", handlePointer, true);

    // Un dialogue non bloquant ne prend pas le focus : la touche Entrée d'un
    // utilisateur au clavier reste sur l'élément qu'il a choisi.
    const frame = isBlocking
      ? requestAnimationFrame(() => {
          contentRef.current?.focus();
        })
      : null;

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKey);
      if (!isBlocking) document.removeEventListener("pointerdown", handlePointer, true);
      if (isBlocking) {
        unlockBodyScroll();
        previousActive?.focus?.();
      }
    };
  }, [open, isBlocking]);

  if (!open) return null;

  return (
    <div
      className={dialogRootVariants({ blocking: isBlocking })}
      role="dialog"
      aria-modal={isBlocking ? "true" : "false"}
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
        className={cn(dialogContentVariants({ size, blocking: isBlocking }), "z-[1]", className)}
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
