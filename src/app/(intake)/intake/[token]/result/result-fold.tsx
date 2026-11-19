// ============================================================================
// Quick Intake Result — section repliée, sans effet sur le PDF
// ============================================================================
// À l'écran : un bouton (aria-expanded) ouvre ou ferme la section. À
// l'impression (le PDF payant est rendu depuis cette page), le contenu est
// TOUJOURS déplié : `print:block` ignore l'état replié, et le bouton disparaît.
// Un <details> fermé, lui, ne s'imprime pas — d'où ce composant.
// ============================================================================

"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function ResultFold({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <div className="border-t border-border-subtle print:border-0">
      <h2 className="print:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 py-4 text-left text-base font-semibold text-foreground transition-colors hover:text-primary"
        >
          <span>{title}</span>
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      <div id={contentId} className={`${open ? "block" : "hidden"} pb-6 print:block print:pb-0`}>
        {children}
      </div>
    </div>
  );
}
