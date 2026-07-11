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
  /**
   * Préfixes de routes supplémentaires qui allument cet item (hubs et
   * onglets : les pages piliers allument « Fondation », guidelines/assets
   * allument « Livrables », …). L'item actif est celui dont le préfixe
   * correspondant est le plus long — un href imbriqué (settings/billing
   * sous settings) gagne donc sur son parent. Lot 10, audit 2026-07-11 §B.
   */
  activePrefixes?: string[];
  /**
   * Slot explicite de la tabbar mobile (4 max, ordre de déclaration) —
   * remplace l'ancien `slice(0, 4)` qui promouvait les 4 premiers items
   * de la sidebar quels qu'ils soient.
   */
  mobileTab?: boolean;
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
