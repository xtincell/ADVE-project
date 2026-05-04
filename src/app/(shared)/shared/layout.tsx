/**
 * Shared Layout — Minimal public layout without auth or sidebar.
 * Used for shareable strategy presentations.
 *
 * ToastProvider est wrappé ici car les sections Phase 13 contiennent des
 * `<PtahForgeButton>` qui appellent `useToast()`. Sans ce provider, le
 * rendu Oracle Phase 13 crash avec "useToast must be used within a
 * <ToastProvider>". (Bug observé sur /shared/strategy/<token> mai 2026.)
 */

import { ToastProvider } from "@/components/shared/notification-toast";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="airy" data-portal="shared" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-[var(--z-topbar)] border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
              LF
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground-secondary">
              La Fusée
            </span>
          </div>
          <div className="ml-auto text-xs text-foreground-muted">Proposition Stratégique</div>
        </div>
      </header>

      <ToastProvider>
        <main>{children}</main>
      </ToastProvider>

      {/* Print styles */}
      <style>{`
        @media print {
          header { display: none !important; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>
    </div>
  );
}
