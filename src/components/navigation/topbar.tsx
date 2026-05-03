"use client";

import { useState, useEffect } from "react";
import { Search, Brain, User, LogOut, Settings, ChevronDown } from "lucide-react";
import { PortalSwitcher } from "./portal-switcher";
import { Breadcrumb } from "./breadcrumb";
import { NotificationBell } from "@/components/neteru/notification-bell";
import type { PortalId } from "./types";

interface TopbarProps {
  currentPortal: PortalId;
  onOpenCommandPalette?: () => void;
  onToggleMestor?: () => void;
  /** @deprecated — branché live via NotificationBell (ADR-0025). */
  notificationCount?: number;
  mestorHasSuggestions?: boolean;
  userName?: string;
}

export function Topbar({
  currentPortal,
  onOpenCommandPalette,
  onToggleMestor,
  mestorHasSuggestions = false,
  userName = "Utilisateur",
}: TopbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenCommandPalette?.();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        onToggleMestor?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenCommandPalette, onToggleMestor]);

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
      {/* Left: Portal Switcher + Breadcrumb */}
      <div className="flex items-center gap-3">
        <PortalSwitcher currentPortal={currentPortal} />
        <div className="hidden md:block">
          <Breadcrumb />
        </div>
      </div>

      {/* Center: Search trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="mx-auto hidden items-center gap-2 rounded-lg border border-border-subtle bg-background-subtle px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:border-border hover:text-foreground-secondary md:flex"
        aria-label="Ouvrir la recherche"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Rechercher...</span>
        <kbd className="ml-4 rounded-sm border border-border-subtle bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
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
        {/* Notifications — live SSE + dropdown (ADR-0025) */}
        <NotificationBell />

        {/* Mestor toggle */}
        <button
          onClick={onToggleMestor}
          className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            mestorHasSuggestions
              ? "text-primary animate-[pulse-glow_2s_ease-in-out_infinite]"
              : "text-foreground-muted hover:bg-background-overlay hover:text-foreground"
          }`}
          aria-label="Ouvrir Mestor AI"
        >
          <Brain className="h-4 w-4" />
          {mestorHasSuggestions && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </button>

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
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground-secondary transition-colors hover:bg-background-overlay hover:text-foreground">
                <Settings className="h-4 w-4" />
                Parametres
              </button>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive-subtle">
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
