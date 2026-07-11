"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { NavGroup, NavItem } from "./types";
import { resolveActiveHref, navItemLabel } from "./nav-active";
import { useLocale } from "@/lib/i18n/locale-context";

interface MobileTabBarProps {
  navGroups: NavGroup[];
  portalAccentVar: string;
  maxTabs?: number;
}

export function MobileTabBar({ navGroups, portalAccentVar, maxTabs = 4 }: MobileTabBarProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [moreOpen, setMoreOpen] = useState(false);

  const allItems = navGroups.flatMap((g) => g.items);

  // Même résolution d'item actif que la sidebar (préfixe le plus long gagne).
  const activeHref = resolveActiveHref(navGroups, pathname);
  const isActive = (item: NavItem) => item.href === activeHref;

  // Onglets = slots explicites `mobileTab` (lot 10) ; fallback sur les N
  // premiers items pour les portails qui n'ont pas encore déclaré leurs slots.
  const flagged = allItems.filter((i) => i.mobileTab);
  const visibleItems = (flagged.length > 0 ? flagged : allItems).slice(0, maxTabs);
  const hasOverflow = allItems.length > visibleItems.length;
  const overflowHrefs = new Set(visibleItems.map((i) => i.href));
  const overflowGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((it) => !overflowHrefs.has(it.href)) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {/* Bottom tab bar - only visible on mobile. Hauteur + safe-area (encoches). */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[var(--z-sidebar)] flex items-stretch justify-around border-t border-border-subtle bg-background/95 backdrop-blur-md md:hidden"
        style={{ height: "calc(var(--mobile-tab-height) + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation mobile"
      >
        {visibleItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-[var(--tap-min)] flex-1 flex-col items-center justify-center gap-0.5 ${
                active ? "text-foreground" : "text-foreground-muted"
              }`}
            >
              <Icon className="h-5 w-5" style={active ? { color: portalAccentVar } : undefined} />
              <span className="text-2xs font-medium leading-none">{navItemLabel(item, t)}</span>
            </Link>
          );
        })}

        {hasOverflow && (
          <button
            onClick={() => setMoreOpen(true)}
            className="flex min-w-[var(--tap-min)] flex-1 flex-col items-center justify-center gap-0.5 text-foreground-muted"
            aria-label="Plus de pages"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-2xs font-medium leading-none">Plus</span>
          </button>
        )}
      </nav>

      {/* More sheet overlay — regroupé par section (préserve la hiérarchie). */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-background/60 backdrop-blur-sm md:hidden animate-[fade-in_150ms_ease-out]"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[var(--z-modal)] max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-border bg-background-raised p-4 md:hidden animate-[slide-up_250ms_ease-out]"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            {overflowGroups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "mt-4" : ""}>
                {group.title && (
                  <p className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-[0.05em] text-foreground-muted">
                    {group.titleKey ? t(group.titleKey) : group.title}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex min-h-[var(--tap-min)] flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-colors ${
                          active ? "bg-background-overlay" : "hover:bg-background-overlay/50"
                        }`}
                      >
                        <Icon className="h-5 w-5" style={active ? { color: portalAccentVar } : undefined} />
                        <span className="text-center text-2xs font-medium text-foreground-secondary">{navItemLabel(item, t)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
