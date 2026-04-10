"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft, Star, Home } from "lucide-react";
import type { NavGroup } from "./types";

interface SidebarProps {
  navGroups: NavGroup[];
  portalAccentVar: string;
  headerContent?: React.ReactNode;
}

export function Sidebar({ navGroups, portalAccentVar, headerContent }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

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

  const isActive = (href: string, basePath: string) => {
    if (href === basePath) return pathname === basePath;
    return pathname.startsWith(href);
  };

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
      className="sticky top-[var(--topbar-height)] flex h-[calc(100vh-var(--topbar-height))] shrink-0 flex-col border-r border-border-subtle bg-background-subtle transition-[width] duration-normal ease-out"
      style={{ width: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-expanded)" }}
    >
      {/* Header area */}
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-3">
        {!collapsed && headerContent && (
          <div className="min-w-0 flex-1 truncate">{headerContent}</div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
          aria-label={collapsed ? "Ouvrir la barre laterale" : "Reduire la barre laterale"}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Favorites section */}
      {!collapsed && favoriteItems.length > 0 && (
        <div className="border-b border-border-subtle px-3 py-2">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted">
            Favoris
          </p>
          {favoriteItems.map((item) => {
            const active = isActive(item.href, basePath);
            const Icon = item.icon;
            return (
              <Link
                key={`fav-${item.href}`}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-background-overlay text-foreground"
                    : "text-foreground-secondary hover:bg-background-overlay hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={active ? { color: portalAccentVar } : undefined} />
                <span className="truncate">{item.label}</span>
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
                className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted"
                style={group.divisionColor ? { borderLeft: `3px solid ${group.divisionColor}`, paddingLeft: "8px" } : undefined}
              >
                {group.title}
              </p>
            )}
            {collapsed && group.title && <div className="mx-auto my-2 h-px w-6 bg-border-subtle" />}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, basePath);
                const Icon = item.icon;
                const isFav = favorites.includes(item.href);

                return (
                  <div key={item.href} className="group relative flex items-center">
                    <Link
                      href={item.href}
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
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={active ? { color: group.divisionColor || portalAccentVar } : undefined}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span
                          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-primary-foreground"
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
                        aria-label={isFav ? `Retirer ${item.label} des favoris` : `Ajouter ${item.label} aux favoris`}
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

      {/* Footer — Home link + version */}
      <div className="mt-auto border-t border-border-subtle px-3 py-2">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          {!collapsed ? <span>Accueil</span> : null}
        </Link>
        {!collapsed ? (
          <p className="mt-1 px-2 text-[9px] text-foreground-muted/40">
            LaFusee v5.0 — NETERU
          </p>
        ) : null}
      </div>
    </aside>
  );
}
