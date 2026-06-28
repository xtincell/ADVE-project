"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/primitives/button";
import { Briefcase, Plus } from "lucide-react";

/**
 * Mes services (gigs façon Fiverr/Malt, ADR-0117) — un prestataire liste ses
 * offres avec description + prix indicatif, indépendamment des missions ouvertes.
 */
export default function CreatorServicesPage() {
  const utils = trpc.useUtils();
  const { data: services, isLoading } = trpc.talentServices.listMine.useQuery();
  const [form, setForm] = useState({ title: "", description: "", category: "", priceAmount: "", deliveryDays: "" });
  const [open, setOpen] = useState(false);

  const invalidate = () => utils.talentServices.listMine.invalidate();
  const create = trpc.talentServices.create.useMutation({
    onSuccess: () => { invalidate(); setOpen(false); setForm({ title: "", description: "", category: "", priceAmount: "", deliveryDays: "" }); },
  });
  const toggle = trpc.talentServices.toggle.useMutation({ onSuccess: invalidate });

  if (isLoading) return <SkeletonPage />;
  const items = services ?? [];
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  const submit = () => {
    const price = parseFloat(form.priceAmount);
    if (!form.title.trim() || !form.description.trim() || !Number.isFinite(price)) return;
    create.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim() || undefined,
      priceAmount: price,
      deliveryDays: form.deliveryDays ? parseInt(form.deliveryDays, 10) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes services"
        description="Liste tes offres avec un prix indicatif. Les marques peuvent les parcourir et te solliciter."
        breadcrumbs={[{ label: "Creator", href: "/creator" }, { label: "Services" }]}
      />
      <div>
        <Button size="sm" variant="primary" onClick={() => setOpen((o) => !o)}><Plus className="mr-1 h-4 w-4" /> Nouveau service</Button>
      </div>

      {open && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Titre (ex. Séance photo produit — 10 visuels)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Description de l'offre"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex flex-wrap gap-3">
            <input
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Catégorie (PHOTO, VIDEO…)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <input
              className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Prix (XAF)"
              inputMode="numeric"
              value={form.priceAmount}
              onChange={(e) => setForm({ ...form, priceAmount: e.target.value })}
            />
            <input
              className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Délai (jours)"
              inputMode="numeric"
              value={form.deliveryDays}
              onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
            />
          </div>
          <Button size="sm" variant="primary" disabled={create.isPending} onClick={submit}>Publier</Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aucun service" description="Crée ton premier service pour le rendre visible aux marques." />
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-foreground-muted">{s.description}</p>
                <p className="mt-1 text-xs text-foreground-muted">
                  {s.category ? `${s.category} · ` : ""}{fmt(s.priceAmount)} {s.currency} / {s.priceUnit}
                  {s.deliveryDays ? ` · ${s.deliveryDays} j` : ""}
                </p>
              </div>
              <Button size="sm" variant={s.active ? "outline" : "subtle"} disabled={toggle.isPending} onClick={() => toggle.mutate({ serviceId: s.id, active: !s.active })}>
                {s.active ? "Actif" : "Inactif"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
