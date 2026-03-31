"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { NavGroup, NavItem } from "./types";

interface MobileTabBarProps {
  navGroups: NavGroup[];
  portalAccentVar: string;
  maxTabs?: number;
}

export function MobileTabBar({ navGroups, portalAccentVar, maxTabs = 4 }: MobileTabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const allItems = navGroups.flatMap((g) => g.items);
  const basePath = allItems[0]?.href || "/";

  const isActive = (href: string) => {
    if (href === basePath) return pathname === basePath;
    return pathname.startsWith(href);
  };

  // Show first N items as tabs, rest in "More" sheet
  const visibleItems = allItems.slice(0, maxTabs);
  const overflowItems = allItems.slice(maxTabs);
  const hasOverflow = overflowItems.length > 0;

  return (
    <>
      {/* Bottom tab bar - only visible on mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[var(--z-sidebar)] flex h-[var(--mobile-tab-height)] items-center justify-around border-t border-border-subtle bg-background/95 backdrop-blur-md md:hidden"
        aria-label="Navigation mobile"
      >
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 ${
                active ? "text-foreground" : "text-foreground-muted"
              }`}
            >
              <Icon className="h-5 w-5" style={active ? { color: portalAccentVar } : undefined} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {hasOverflow && (
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-foreground-muted"
            aria-label="Plus de pages"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">Plus</span>
          </button>
        )}
      </nav>

      {/* More sheet overlay */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-background/60 backdrop-blur-sm md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[var(--z-modal)] rounded-t-2xl border-t border-border bg-background-raised p-4 pb-8 md:hidden animate-[slide-up_250ms_ease-out]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="grid grid-cols-3 gap-2">
              {overflowItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors ${
                      active ? "bg-background-overlay" : "hover:bg-background-overlay/50"
                    }`}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={active ? { color: portalAccentVar } : undefined}
                    />
                    <span className="text-center text-[11px] font-medium text-foreground-secondary">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
