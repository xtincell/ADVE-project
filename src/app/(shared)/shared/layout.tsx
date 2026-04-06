/**
 * Shared Layout — Minimal public layout without auth or sidebar.
 * Used for shareable strategy presentations.
 */

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Minimal header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold text-white">
              LF
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-400">
              LaFusee
            </span>
          </div>
          <div className="ml-auto text-xs text-zinc-600">Proposition Strategique</div>
        </div>
      </header>

      <main>{children}</main>

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
