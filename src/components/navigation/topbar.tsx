"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search, Brain, User, LogOut, Settings, ChevronDown, Menu } from "lucide-react";
import { PortalSwitcher } from "./portal-switcher";
import { Breadcrumb } from "./breadcrumb";
import { NotificationBell } from "@/components/neteru/notification-bell";
import { LocaleToggle } from "@/components/i18n/locale-toggle";
import type { PortalId } from "./types";

interface TopbarProps {
  currentPortal: PortalId;
  onOpenCommandPalette?: () => void;
  /**
   * Page assistant du portail (ex. /cockpit/mestor). Quand absent, le bouton
   * n'est pas rendu — fin du bouton no-op qui togglait un état jamais
   * consommé (lot 10, audit 2026-07-11 [M01-04]).
   */
  assistantHref?: string;
  /** Ouvre le tiroir de navigation mobile (md:hidden). */
  onOpenMobileNav?: () => void;
  /** @deprecated — branché live via NotificationBell (ADR-0025). */
  notificationCount?: number;
  assistantHasSuggestions?: boolean;
  userName?: string;
}

// Resolve the settings page for each portal. Cockpit has /cockpit/settings
// (session info + logout). Other portals fall back to /cockpit/settings for
// now — extend per-portal as dedicated settings pages land.
function settingsPathForPortal(portal: PortalId): string {
  switch (portal) {
    case "cockpit":
      return "/cockpit/settings";
    case "console":
      return "/console/config";
    case "agency":
      return "/cockpit/settings";
    case "creator":
      return "/creator/profile";
    default:
      return "/cockpit/settings";
  }
}

export function Topbar({
  currentPortal,
  onOpenCommandPalette,
  assistantHref,
  onOpenMobileNav,
  assistantHasSuggestions = false,
  userName = "Utilisateur",
}: TopbarProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenCommandPalette?.();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "." && assistantHref) {
        e.preventDefault();
        router.push(assistantHref);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenCommandPalette, assistantHref, router]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-user-menu]")) setUserMenuOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [userMenuOpen]);

  return (
    <header
      className="sticky top-0 z-[var(--z-topbar)] flex h-[var(--topbar-height)] items-center gap-3 border-b border-border-subtle bg-background/80 px-4 backdrop-blur-md"
      role="banner"
    >
      {/* Mobile: hamburger to open the grouped nav drawer */}
      <button
        onClick={onOpenMobileNav}
        className="-ml-1 flex h-11 w-11 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:bg-background-overlay hover:text-foreground md:hidden"
        aria-label="Ouvrir le menu de navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Left: Portal Switcher + Breadcrumb */}
      <div className="flex items-center gap-3">
        <PortalSwitcher currentPortal={currentPortal} />
        <div className="hidden md:block">
          <Breadcrumb />
        </div>
      </div>

      {/* Center: Search trigger */}
      <button
        data-tour-step="search"
        onClick={onOpenCommandPalette}
        className="mx-auto hidden items-center gap-2 rounded-lg border border-border-subtle bg-background-subtle px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:border-border hover:text-foreground-secondary md:flex"
        aria-label="Ouvrir la recherche"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Rechercher...</span>
        <kbd className="ml-4 rounded-sm border border-border-subtle bg-background px-1.5 py-0.5 text-2xs font-medium text-foreground-muted">
          Ctrl K
        </kbd>
      </button>

      {/* Mobile search icon */}
      <button
        onClick={onOpenCommandPalette}
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:text-foreground md:hidden"
        aria-label="Rechercher"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Language switcher FR / EN / 中文 — international market */}
        <div className="mr-1 hidden sm:block">
          <LocaleToggle variant="compact" />
        </div>

        {/* Notifications — live SSE + dropdown (ADR-0025) */}
        <NotificationBell />

        {/* Assistant — lien vers la page assistant du portail (Cmd+.) */}
        {assistantHref ? (
          <button
            data-tour-step="mestor"
            onClick={() => router.push(assistantHref)}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              assistantHasSuggestions
                ? "text-primary animate-[pulse-glow_2s_ease-in-out_infinite]"
                : "text-foreground-muted hover:bg-background-overlay hover:text-foreground"
            }`}
            aria-label="Ouvrir l'assistant"
          >
            <Brain className="h-4 w-4" />
            {assistantHasSuggestions && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        ) : null}

        {/* User menu */}
        <div className="relative" data-user-menu>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-foreground-secondary transition-colors hover:bg-background-overlay hover:text-foreground"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-subtle">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <ChevronDown className="hidden h-3 w-3 md:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-background-raised p-1 shadow-lg animate-[scale-in_150ms_ease-out]">
              <div className="border-b border-border-subtle px-3 py-2">
                <p className="text-sm font-medium text-foreground">{userName}</p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push(settingsPathForPortal(currentPortal));
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground-secondary transition-colors hover:bg-background-overlay hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Parametres
              </button>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  void signOut({ callbackUrl: "/login" });
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive-subtle"
              >
                <LogOut className="h-4 w-4" />
                Deconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
