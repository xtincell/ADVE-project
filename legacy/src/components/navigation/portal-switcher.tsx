"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Shield,
  Terminal,
  Building2,
  ChevronDown,
  Rocket,
  LayoutGrid,
} from "lucide-react";
import type { PortalId } from "./types";

interface PortalOption {
  id: PortalId | "landing" | "hub";
  label: string;
  sublabel: string;
  href: string;
  icon: React.ElementType;
  accentColor: string;
  /** When set, portal only shows if predicate returns true */
  visible?: (user: { role?: string; operatorId?: string | null }) => boolean;
}

const ALL_PORTALS: PortalOption[] = [
  {
    id: "landing",
    label: "La Fusée",
    sublabel: "Retour à la landing",
    href: "/",
    icon: Rocket,
    accentColor: "var(--color-accent)",
  },
  {
    id: "hub",
    label: "Hub des portails",
    sublabel: "Tous mes accès",
    href: "/portals",
    icon: LayoutGrid,
    accentColor: "var(--color-foreground)",
  },
  {
    id: "cockpit",
    label: "Brand OS",
    sublabel: "Cockpit marque",
    href: "/cockpit",
    icon: Sparkles,
    accentColor: "var(--color-portal-cockpit)",
  },
  {
    id: "creator",
    label: "Guild OS",
    sublabel: "Espace creatif",
    href: "/creator",
    icon: Shield,
    accentColor: "var(--color-portal-creator)",
  },
  {
    id: "agency",
    label: "Console Agence",
    sublabel: "Gestion clients",
    href: "/agency",
    icon: Building2,
    accentColor: "var(--color-portal-agency, #8b5cf6)",
    visible: (user) => !!user.operatorId && user.role !== "ADMIN",
  },
  {
    id: "console",
    label: "Console Industry",
    sublabel: "Fixer ecosysteme",
    href: "/console",
    icon: Terminal,
    accentColor: "var(--color-portal-console)",
    visible: (user) => user.role === "ADMIN",
  },
];

interface PortalSwitcherProps {
  currentPortal: PortalId;
}

export function PortalSwitcher({ currentPortal }: PortalSwitcherProps) {
  const [open, setOpen] = useState(false);

  // Show all portals — visibility is enforced by route guards, not the switcher.
  // The current portal (derived from the active route) always appears highlighted.
  const visiblePortals = ALL_PORTALS;
  const current = visiblePortals.find((p) => p.id === currentPortal) ?? visiblePortals[0]!;
  const Icon = current.icon;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-portal-switcher]")) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  return (
    <div className="relative" data-portal-switcher>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-background-overlay"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Changer de portail"
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ backgroundColor: `color-mix(in oklch, ${current.accentColor} 20%, transparent)` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: current.accentColor }} />
        </div>
        <span className="hidden text-sm font-semibold text-foreground md:block">{current.label}</span>
        <ChevronDown className="h-3 w-3 text-foreground-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[var(--z-dropdown)] mt-1 w-56 rounded-lg border border-border bg-background-raised p-1.5 shadow-lg animate-[scale-in_150ms_ease-out]">
          {visiblePortals.map((portal) => {
            const PortalIcon = portal.icon;
            const isActive = portal.id === currentPortal;
            return (
              <Link
                key={portal.id}
                href={portal.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors ${
                  isActive
                    ? "bg-background-overlay"
                    : "hover:bg-background-overlay/50"
                }`}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md"
                  style={{ backgroundColor: `color-mix(in oklch, ${portal.accentColor} 15%, transparent)` }}
                >
                  <PortalIcon className="h-4 w-4" style={{ color: portal.accentColor }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{portal.label}</p>
                  <p className="text-xs text-foreground-muted">{portal.sublabel}</p>
                </div>
                {isActive && (
                  <div
                    className="ml-auto h-2 w-2 rounded-full"
                    style={{ backgroundColor: portal.accentColor }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
