import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Optional second muted line (pillar role, tool descriptor). */
  sublabel?: string;
  icon: LucideIcon;
  badge?: number;
  minTier?: string;
  /**
   * Pillar slug ("pillar-a" …) when this item maps to an ADVERTIS pillar.
   * Lets the locale-aware sidebar translate label/sublabel from the i18n
   * dictionary without re-keying every nav entry.
   */
  pillarSlug?: string;
  /** Explicit i18n keys (non-pillar items: Jehuty, Notoria, …). */
  labelKey?: string;
  sublabelKey?: string;
}

export interface NavGroup {
  title: string;
  /** Optional i18n key for the group title (FR/EN/中文). */
  titleKey?: string;
  items: NavItem[];
  divisionColor?: string;
}

export type PortalId = "cockpit" | "creator" | "console" | "agency";

export interface PortalConfig {
  id: PortalId;
  label: string;
  sublabel: string;
  basePath: string;
  accentClass: string;
  navGroups: NavGroup[];
  headerContent?: React.ReactNode;
}
