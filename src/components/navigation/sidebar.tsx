"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft, Star, Home } from "lucide-react";
import type { NavGroup, NavItem } from "./types";
import { resolveActiveHref, navItemLabel, navItemSublabel } from "./nav-active";
import { useLocale } from "@/lib/i18n/locale-context";

interface SidebarProps {
  navGroups: NavGroup[];
  portalAccentVar: string;
  headerContent?: React.ReactNode;
  /** Rendu dans le tiroir mobile : pleine largeur, jamais réduit, ferme à la navigation. */
  mobile?: boolean;
  /** Appelé à chaque navigation (pour fermer le tiroir mobile). */
  onNavigate?: () => void;
}

export function Sidebar({ navGroups, portalAccentVar, headerContent, mobile = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [collapsedState, setCollapsedState] = useState(false);
  // En tiroir mobile, jamais réduit (on veut la nav groupée complète).
  const collapsed = mobile ? false : collapsedState;
  const setCollapsed = setCollapsedState;
  const [favorites, setFavorites] = useState<string[]>([]);

  // Locale-aware label resolution — partagée avec la tabbar mobile
  // (nav-active.ts) pour que desktop et mobile affichent les mêmes libellés.
  const itemLabel = (item: NavItem): string => navItemLabel(item, t);
  const itemSublabel = (item: NavItem): string | undefined => navItemSublabel(item, t);

  useEffect(() => {
    const stored = localStorage.getItem("lf-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
    const storedFavs = localStorage.getItem("lf-sidebar-favorites");
    if (storedFavs) setFavorites(JSON.parse(storedFavs));
  }, []);

  useEffect(() => {
    localStorage.setItem("lf-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Un seul item actif — celui dont le préfixe matché (href ou
  // activePrefixes) est le plus long. Cf. nav-active.ts (lot 10).
  const activeHref = resolveActiveHref(navGroups, pathname);
  const isActive = (item: NavItem) => item.href === activeHref;

  const basePath = navGroups[0]?.items[0]?.href || "/";

  const toggleFavorite = (href: string) => {
    setFavorites((prev) => {
      const next = prev.includes(href)
        ? prev.filter((f) => f !== href)
        : prev.length < 5
          ? [...prev, href]
          : prev;
      localStorage.setItem("lf-sidebar-favorites", JSON.stringify(next));
      return next;
    });
  };

  const allItems = navGroups.flatMap((g) => g.items);
  const favoriteItems = allItems.filter((item) => favorites.includes(item.href));

  return (
    <aside
      data-tour-step="sidebar"
      className={
        mobile
          ? "flex h-full w-full flex-col overflow-y-auto bg-background-subtle"
          : "sticky top-[var(--topbar-height)] flex h-[calc(100vh-var(--topbar-height))] shrink-0 flex-col overflow-visible border-r border-border-subtle bg-background-subtle transition-[width] duration-normal ease-out"
      }
      style={mobile ? undefined : { width: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-expanded)" }}
    >
      {/* Header area */}
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-3 overflow-visible relative z-[60]">
        {!collapsed && headerContent && (
          <div className="min-w-0 flex-1 overflow-visible">{headerContent}</div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
            aria-label={collapsed ? "Ouvrir la barre laterale" : "Reduire la barre laterale"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Favorites section */}
      {!collapsed && favoriteItems.length > 0 && (
        <div className="border-b border-border-subtle px-3 py-2">
          <p className="mb-1 px-2 text-2xs font-semibold uppercase tracking-[0.05em] text-foreground-muted">
            Favoris
          </p>
          {favoriteItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={`fav-${item.href}`}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-background-overlay text-foreground"
                    : "text-foreground-secondary hover:bg-background-overlay hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={active ? { color: portalAccentVar } : undefined} />
                <span className="truncate">{itemLabel(item)}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navigation principale">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.title && !collapsed && (
              <p
                className="mb-1 px-2 text-2xs font-semibold uppercase tracking-[0.05em] text-foreground-muted"
                style={group.divisionColor ? { borderLeft: `3px solid ${group.divisionColor}`, paddingLeft: "8px" } : undefined}
              >
                {group.titleKey ? t(group.titleKey) : group.title}
              </p>
            )}
            {collapsed && group.title && <div className="mx-auto my-2 h-px w-6 bg-border-subtle" />}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                const isFav = favorites.includes(item.href);

                return (
                  <div key={item.href} className="group relative flex items-center">
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-background-overlay text-foreground"
                          : "text-foreground-secondary hover:bg-background-overlay/50 hover:text-foreground"
                      }`}
                      style={
                        active
                          ? {
                              borderLeft: `3px solid ${group.divisionColor || portalAccentVar}`,
                              paddingLeft: collapsed ? "10px" : "5px",
                            }
                          : collapsed
                            ? { justifyContent: "center" }
                            : undefined
                      }
                      title={collapsed ? itemLabel(item) : undefined}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={active ? { color: group.divisionColor || portalAccentVar } : undefined}
                      />
                      {!collapsed && (() => {
                        const sub = itemSublabel(item);
                        return sub ? (
                          <span className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate">{itemLabel(item)}</span>
                            <span className="truncate text-2xs font-normal text-foreground-muted">{sub}</span>
                          </span>
                        ) : (
                          <span className="truncate">{itemLabel(item)}</span>
                        );
                      })()}
                      {!collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span
                          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-bold text-primary-foreground"
                          style={{ backgroundColor: portalAccentVar }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                    {/* Favorite toggle on hover */}
                    {!collapsed && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(item.href);
                        }}
                        className={`absolute right-1 flex h-6 w-6 items-center justify-center rounded-md transition-opacity ${
                          isFav ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                        } hover:!opacity-100`}
                        aria-label={isFav ? `Retirer ${itemLabel(item)} des favoris` : `Ajouter ${itemLabel(item)} aux favoris`}
                      >
                        <Star className={`h-3 w-3 ${isFav ? "fill-warning text-warning" : "text-foreground-muted"}`} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — retour à la racine du portail (jamais la landing publique :
          un client connecté ne doit pas être éjecté du produit — lot 10). */}
      <div className="mt-auto border-t border-border-subtle px-3 py-2">
        <Link
          href={basePath}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          {!collapsed ? <span>Accueil</span> : null}
        </Link>
        {!collapsed ? (
          <p className="mt-1 px-2 text-[9px] text-foreground-muted/40">
            La Fusée v5.0
          </p>
        ) : null}
      </div>
    </aside>
  );
}
