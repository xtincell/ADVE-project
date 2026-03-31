import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  divisionColor?: string;
}

export type PortalId = "cockpit" | "creator" | "console";

export interface PortalConfig {
  id: PortalId;
  label: string;
  sublabel: string;
  basePath: string;
  accentClass: string;
  navGroups: NavGroup[];
  headerContent?: React.ReactNode;
}
