"use client";

/**
 * Console · Le Socle — Coûts marché × période (ADR-0094).
 * Visualise et édite la base de coûts marché historisés. 100 % déterministe.
 */

import * as React from "react";
import { Plus, DatabaseZap } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { Card, CardHeader, CardBody } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Field, FieldError } from "@/components/primitives/field";
import { Label } from "@/components/primitives/label";
import { Badge } from "@/components/primitives/badge";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export default function MarketCostsPage() {
  const utils = trpc.useUtils();
  const list = trpc.marketCost.list.useQuery({});
  const seed = trpc.marketCost.seedBaseline.useMutation({
    onSuccess: () => void utils.marketCost.list.invalidate(),
  });
  const upsert = trpc.marketCost.upsert.useMutation({
    onSuccess: () => {
      void utils.marketCost.list.invalidate();
      setForm({ countryCode: "", sector: "ALL", metric: "", period: "", p50: "", unit: "FCFA" });
    },
  });

  const [form, setForm] = React.useState({
    countryCode: "",
    sector: "ALL",
    metric: "",
    period: "",
    p50: "",
    unit: "FCFA",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const rows = list.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Coûts marché × période</h1>
          <p className="text-sm text-muted-foreground">
            Base historisée des coûts par (pays, secteur, métrique, période) — déterministe (ADR-0094).
          </p>
        </div>
        <Button
          variant="subtle"
          className="gap-2"
          loading={seed.isPending}
          onClick={() => seed.mutate()}
        >
          <DatabaseZap className="h-4 w-4" /> Seed baseline
        </Button>
      </header>

      {/* Ajout */}
      <Card surface="raised">
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">Ajouter / mettre à jour un coût</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Field>
            <Label htmlFor="cc" required>Pays (ISO-2)</Label>
            <Input id="cc" value={form.countryCode} onChange={set("countryCode")} placeholder="CM" maxLength={2} />
          </Field>
          <Field>
            <Label htmlFor="sec">Secteur</Label>
            <Input id="sec" value={form.sector} onChange={set("sector")} placeholder="ALL" />
          </Field>
          <Field>
            <Label htmlFor="met" required>Métrique</Label>
            <Input id="met" value={form.metric} onChange={set("metric")} placeholder="CPM_META" />
          </Field>
          <Field>
            <Label htmlFor="per" required>Période</Label>
            <Input id="per" value={form.period} onChange={set("period")} placeholder="2026-Q2" />
          </Field>
          <Field>
            <Label htmlFor="p50" required>Valeur (p50)</Label>
            <Input id="p50" type="number" value={form.p50} onChange={set("p50")} placeholder="2500" />
          </Field>
          <Field>
            <Label htmlFor="unit">Unité</Label>
            <Input id="unit" value={form.unit} onChange={set("unit")} placeholder="FCFA" />
          </Field>
          <div className="col-span-2 flex items-end md:col-span-6">
            <Button
              className="gap-2"
              loading={upsert.isPending}
              disabled={!form.countryCode || !form.metric || !form.period || !form.p50}
              onClick={() =>
                upsert.mutate({
                  countryCode: form.countryCode.toUpperCase(),
                  sector: form.sector || "ALL",
                  metric: form.metric,
                  period: form.period,
                  p50: Number(form.p50),
                  unit: form.unit || "FCFA",
                })
              }
            >
              <Plus className="h-4 w-4" /> Enregistrer
            </Button>
          </div>
          {upsert.isError && (
            <div className="col-span-2 md:col-span-6">
              <FieldError>{upsert.error.message}</FieldError>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Table */}
      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--card-radius)] border border-dashed border-border bg-background-subtle px-6 py-12 text-center text-muted-foreground">
          Base vide. Clique « Seed baseline » pour amorcer (CM/CI/SN × 4 métriques × 2 trimestres).
        </div>
      ) : (
        <Card surface="raised">
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Pays</th>
                  <th className="px-4 py-3">Secteur</th>
                  <th className="px-4 py-3">Métrique</th>
                  <th className="px-4 py-3">Période</th>
                  <th className="px-4 py-3 text-right">p10</th>
                  <th className="px-4 py-3 text-right">p50</th>
                  <th className="px-4 py-3 text-right">p90</th>
                  <th className="px-4 py-3">Unité</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle text-foreground-secondary">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.countryCode}</td>
                    <td className="px-4 py-2.5">{r.sector}</td>
                    <td className="px-4 py-2.5">{r.metric}</td>
                    <td className="px-4 py-2.5">{r.period}</td>
                    <td className="px-4 py-2.5 text-right">{r.p10 != null ? fmt(r.p10) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">{fmt(r.p50)}</td>
                    <td className="px-4 py-2.5 text-right">{r.p90 != null ? fmt(r.p90) : "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.unit}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.source === "OPERATOR" ? "accent" : "neutral"}>{r.source}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
