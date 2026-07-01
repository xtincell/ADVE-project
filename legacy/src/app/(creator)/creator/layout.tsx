"use client";

import { AppShell, creatorNavGroups } from "@/components/navigation";
import { Shield } from "lucide-react";
import { PortalWelcome } from "@/components/shared/portal-welcome";
import { PortalTourHost } from "@/components/shared/portal-tour";

function CreatorSidebarHeader() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-subtle">
        <Shield className="h-3.5 w-3.5 text-accent" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">Guild OS</p>
      </div>
    </div>
  );
}

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="comfortable" data-portal="creator" className="contents">
      <AppShell
        portal="creator"
        navGroups={creatorNavGroups}
        portalAccentVar="var(--color-portal-creator)"
        sidebarHeader={<CreatorSidebarHeader />}
      >
        {children}
      </AppShell>
      <PortalWelcome portal="creator" />
      <PortalTourHost portal="creator" />
    </div>
  );
}
