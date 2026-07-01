import React from "react";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Metric name, e.g. "Total Clients". */
  label: string;
  /** The headline figure (string or number), e.g. "2.450.000". */
  value: React.ReactNode;
  /** Unit shown after the value, e.g. "FCFA". */
  suffix?: string;
  /** Change indicator, e.g. "+12% ce mois". */
  delta?: React.ReactNode;
  /** Direction of the delta (sets colour + arrow). */
  trend?: "up" | "down";
  /** `accent` = the red filled KPI tile. */
  variant?: "default" | "accent";
  /** Optional metric icon. */
  icon?: React.ReactNode;
}

/**
 * KPI tile for dashboard bento grids (Revenus, Total Clients, Engagement…).
 *
 * @startingPoint section="Core" subtitle="KPI tile with delta" viewport="700x180"
 */
export function StatCard(props: StatCardProps): JSX.Element;
