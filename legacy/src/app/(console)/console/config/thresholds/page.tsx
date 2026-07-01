"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Sliders, AlertTriangle, TrendingUp, Crown, DollarSign } from "lucide-react";

const THRESHOLD_SECTIONS = [
  {
    title: "Alertes ADVE",
    icon: AlertTriangle,
    items: [
      { label: "Score minimum avant alerte", key: "adve_min_score", value: "80" },
      { label: "Baisse maximale entre snapshots", key: "adve_max_drop", value: "15" },
      { label: "Jours sans evolution", key: "adve_stale_days", value: "30" },
    ],
  },
  {
    title: "Promotion Guilde",
    icon: Crown,
    items: [
      { label: "FPR minimum pour promotion", key: "guild_fpr_min", value: "85" },
      { label: "Missions minimum (Artisan)", key: "guild_missions_artisan", value: "10" },
      { label: "Missions minimum (Maitre)", key: "guild_missions_maitre", value: "25" },
      { label: "Score QC minimum", key: "guild_qc_min", value: "4.0" },
    ],
  },
  {
    title: "Commissions",
    icon: DollarSign,
    items: [
      { label: "Taux commission defaut (%)", key: "commission_rate_default", value: "15" },
      { label: "Delai paiement (jours)", key: "commission_payment_delay", value: "30" },
      { label: "Montant minimum retrait (XAF)", key: "commission_min_withdrawal", value: "10000" },
    ],
  },
  {
    title: "SLA & Performance",
    icon: TrendingUp,
    items: [
      { label: "SLA mission standard (heures)", key: "sla_standard_hours", value: "72" },
      { label: "SLA mission urgent (heures)", key: "sla_urgent_hours", value: "24" },
      { label: "Alerte SLA a (% du delai)", key: "sla_warning_pct", value: "75" },
    ],
  },
];

export default function ThresholdsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Seuils & Alertes" description="Configuration des seuils d'alerte ADVE, promotion guilde, commissions et SLA" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Config", href: "/console/config" }, { label: "Seuils" }]} />

      <div className="space-y-6">
        {THRESHOLD_SECTIONS.map((section) => (
          <div key={section.title} className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <section.icon className="h-4 w-4 text-foreground-secondary" />
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            </div>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg bg-background-overlay p-3">
                  <span className="text-sm text-foreground-secondary">{item.label}</span>
                  <span className="rounded-lg border border-border bg-background px-3 py-1 text-sm font-medium text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
