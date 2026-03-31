"use client";

import { AppShell, consoleNavGroups } from "@/components/navigation";
import { Terminal } from "lucide-react";

function ConsoleSidebarHeader() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
        <Terminal className="h-3.5 w-3.5 text-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">Console</p>
        <p className="text-[10px] text-foreground-muted">FIXER</p>
      </div>
    </div>
  );
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      portal="console"
      navGroups={consoleNavGroups}
      portalAccentVar="var(--color-portal-console)"
      sidebarHeader={<ConsoleSidebarHeader />}
    >
      {children}
    </AppShell>
  );
}
