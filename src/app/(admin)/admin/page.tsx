import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDb } from "@/lib/db";
import { subscriptionFilterWhere } from "@/server/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Salle des opérations — compteurs vivants (requêtes count simples), chaque
 * tuile mène à sa section. Server component par requête. Vague 1 console
 * (WP-015) : utilisateurs, workspaces, abonnements, référentiels, audit.
 */
export default async function AdminHomePage() {
  const db = getDb();
  const now = new Date();
  const [
    newLeads,
    pendingSubscriptions,
    activeSubscriptions,
    expiring7d,
    brands,
    workspaces,
    users,
    zoneIndexCount,
    auditLast24h,
  ] = await Promise.all([
    db.intakeLead.count({ where: { status: "NEW" } }),
    db.subscription.count({ where: { status: "pending_manual" } }),
    db.subscription.count({ where: subscriptionFilterWhere("actifs", now) }),
    db.subscription.count({ where: subscriptionFilterWhere("expirent_7j", now) }),
    db.brand.count(),
    db.workspace.count(),
    db.user.count(),
    db.zoneIndex.count(),
    db.auditLog.count({ where: { createdAt: { gte: new Date(now.getTime() - DAY_MS) } } }),
  ]);

  const tiles = [
    {
      label: "Leads à traiter",
      value: newLeads,
      hint: "diagnostics soumis, statut NEW",
      href: "/admin/leads",
      urgent: newLeads > 0,
    },
    {
      label: "Paiements à valider",
      value: pendingSubscriptions,
      hint: "souscriptions en attente manuelle",
      href: "/admin/paiements",
      urgent: pendingSubscriptions > 0,
    },
    {
      label: "Abonnements actifs",
      value: activeSubscriptions,
      hint:
        expiring7d > 0
          ? `dont ${expiring7d} expirant sous 7 jours`
          : "échéance strictement future",
      href: "/admin/abonnements",
      urgent: false,
    },
    {
      label: "Marques",
      value: brands,
      hint: "marques en base, tous paliers",
      href: "/admin/marques",
      urgent: false,
    },
    {
      label: "Workspaces",
      value: workspaces,
      hint: "espaces clients + agence",
      href: "/admin/workspaces",
      urgent: false,
    },
    {
      label: "Utilisateurs",
      value: users,
      hint: "comptes, tous rôles",
      href: "/admin/utilisateurs",
      urgent: false,
    },
    {
      label: "Lignes référentiel",
      value: zoneIndexCount,
      hint: "indices de zone (pricing, coûts…)",
      href: "/admin/referentiels",
      urgent: zoneIndexCount === 0, // référentiel vide = pricing irrésoluble
    },
    {
      label: "Audit — 24 h",
      value: auditLast24h,
      hint: "lignes hash-chaînées écrites",
      href: "/admin/audit",
      urgent: false,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Opérations</p>
        <h1 className="font-display text-3xl font-semibold">Vue d&apos;ensemble</h1>
      </header>

      <div className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="group flex flex-col rounded-lg bg-white p-6 shadow-card transition-shadow hover:shadow-card-lg"
          >
            <p className="text-sm font-medium text-smoke">{tile.label}</p>
            <p
              className={`font-display mt-2 text-4xl font-semibold ${
                tile.urgent ? "text-coral" : "text-ink"
              }`}
            >
              {tile.value}
            </p>
            <p className="mt-1 text-xs text-smoke-2">{tile.hint}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-coral opacity-0 transition-opacity group-hover:opacity-100">
              Ouvrir <ArrowRight className="size-3.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      <p className="text-sm text-smoke">
        Les paiements se valident manuellement (doctrine WhatsApp assumée en V1) — la file
        vit dans{" "}
        <Link href="/admin/paiements" className="font-semibold text-coral hover:underline">
          Paiements
        </Link>
        . Les barèmes (pricing, cost-of-living) s&apos;éditent en base dans{" "}
        <Link href="/admin/referentiels" className="font-semibold text-coral hover:underline">
          Référentiels
        </Link>{" "}
        ; chaque mutation est tracée dans l&apos;
        <Link href="/admin/audit" className="font-semibold text-coral hover:underline">
          AuditLog hash-chaîné
        </Link>{" "}
        (vérification d&apos;intégrité incluse).
      </p>
    </div>
  );
}
