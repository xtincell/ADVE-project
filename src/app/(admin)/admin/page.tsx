import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

/**
 * Salle des opérations — 4 compteurs vivants (requêtes count simples),
 * chaque tuile mène à sa section. Server component par requête.
 */
export default async function AdminHomePage() {
  const db = getDb();
  const [newLeads, pendingSubscriptions, brands, workspaces] = await Promise.all([
    db.intakeLead.count({ where: { status: "NEW" } }),
    db.subscription.count({ where: { status: "pending_manual" } }),
    db.brand.count(),
    db.workspace.count(),
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
      href: "/admin/marques",
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
        . Chaque décision est tracée dans l&apos;AuditLog hash-chaîné.
      </p>
    </div>
  );
}
