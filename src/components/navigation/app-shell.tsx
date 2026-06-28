"use client";

import { useState, useCallback, useEffect } from "react";
import { Topbar } from "./topbar";
import { Sidebar } from "./sidebar";
import { MobileTabBar } from "./mobile-tab-bar";
import { CommandPalette } from "./command-palette";
import { X } from "lucide-react";
import type { PortalId, NavGroup } from "./types";

interface AppShellProps {
  portal: PortalId;
  navGroups: NavGroup[];
  portalAccentVar: string;
  sidebarHeader?: React.ReactNode;
  children: React.ReactNode;
  userName?: string;
  notificationCount?: number;
}

export function AppShell({
  portal,
  navGroups,
  portalAccentVar,
  sidebarHeader,
  children,
  userName,
  notificationCount = 0,
}: AppShellProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mestorOpen, setMestorOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleOpenCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const handleCloseCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const handleToggleMestor = useCallback(() => setMestorOpen((o) => !o), []);
  const handleOpenMobileNav = useCallback(() => setMobileNavOpen(true), []);
  const handleCloseMobileNav = useCallback(() => setMobileNavOpen(false), []);

  // Tiroir mobile : ESC ferme + verrou de scroll du fond (anti-bleed).
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileNavOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [mobileNavOpen]);

  return (
    <div className={`portal-${portal} flex min-h-screen flex-col bg-background`}>
      {/* TopBar */}
      <Topbar
        currentPortal={portal}
        onOpenCommandPalette={handleOpenCommandPalette}
        onToggleMestor={handleToggleMestor}
        onOpenMobileNav={handleOpenMobileNav}
        notificationCount={notificationCount}
        userName={userName}
      />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1">
        {/* Sidebar — hidden on mobile, visible on md+ */}
        <div className="hidden md:block">
          <Sidebar
            navGroups={navGroups}
            portalAccentVar={portalAccentVar}
            headerContent={sidebarHeader}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-[calc(var(--mobile-tab-height)+env(safe-area-inset-bottom))] md:pb-0">
          <div className="animate-[slide-up_250ms_ease-out] p-4 md:p-6">{children}</div>
        </main>
      </div>

      {/* Mobile nav drawer — full grouped navigation, off-canvas (md:hidden) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-[fade-in_150ms_ease-out]"
            onClick={handleCloseMobileNav}
          />
          <div
            className="absolute inset-y-0 left-0 flex flex-col bg-background-subtle shadow-xl animate-[slide-in-left_250ms_ease-out]"
            style={{ width: "var(--drawer-w, min(86vw, 320px))", paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
              <span className="text-2xs font-semibold uppercase tracking-[0.05em] text-foreground-muted">Navigation</span>
              <button
                onClick={handleCloseMobileNav}
                className="flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted hover:bg-background-overlay hover:text-foreground"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar
              navGroups={navGroups}
              portalAccentVar={portalAccentVar}
              headerContent={sidebarHeader}
              mobile
              onNavigate={handleCloseMobileNav}
            />
          </div>
        </div>
      )}

      {/* Mobile Tab Bar */}
      <MobileTabBar navGroups={navGroups} portalAccentVar={portalAccentVar} />

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onClose={handleCloseCommandPalette} />
    </div>
  );
}
