"use client";

import { useState, useCallback } from "react";
import { Topbar } from "./topbar";
import { Sidebar } from "./sidebar";
import { MobileTabBar } from "./mobile-tab-bar";
import { CommandPalette } from "./command-palette";
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

  const handleOpenCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const handleCloseCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const handleToggleMestor = useCallback(() => setMestorOpen((o) => !o), []);

  return (
    <div className={`portal-${portal} flex min-h-screen flex-col bg-background`}>
      {/* TopBar */}
      <Topbar
        currentPortal={portal}
        onOpenCommandPalette={handleOpenCommandPalette}
        onToggleMestor={handleToggleMestor}
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
        <main className="flex-1 overflow-y-auto pb-[var(--mobile-tab-height)] md:pb-0">
          <div className="animate-[slide-up_250ms_ease-out] p-4 md:p-6">{children}</div>
        </main>
      </div>

      {/* Mobile Tab Bar */}
      <MobileTabBar navGroups={navGroups} portalAccentVar={portalAccentVar} />

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onClose={handleCloseCommandPalette} />
    </div>
  );
}
