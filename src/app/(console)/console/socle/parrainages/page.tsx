"use client";

/**
 * Console — file de validation des parrainages (ADR-0157, manual-first).
 * CONVERTED = le filleul a payé → l'opérateur applique les récompenses À LA
 * MAIN (filleul −20 % premier cycle, parrain +1 mois sur son abonnement) puis
 * marque « Récompensé ». Aucun octroi automatique d'argent.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Text, Badge, Button } from "@/components/primitives";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente (pas encore payé)",
  CONVERTED: "Converti — récompenses à appliquer",
  REWARDED: "Récompensé",
  REJECTED: "Rejeté",
};

export default function ParrainagesPage() {
  const utils = trpc.useUtils();
  const list = trpc.referral.adminList.useQuery({});
  const reward = trpc.referral.adminMarkRewarded.useMutation({ onSuccess: () => utils.referral.adminList.invalidate() });
  const reject = trpc.referral.adminReject.useMutation({ onSuccess: () => utils.referral.adminList.invalidate() });
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Parrainages</h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground-secondary">
          Doctrine : filleul −20 % sur le premier cycle · parrain 1 mois offert à la conversion payée.
          Les récompenses s&apos;appliquent à la main (validation du paiement du filleul, extension de
          l&apos;abonnement du parrain) — puis on marque « Récompensé » ici.
        </p>
      </header>

      {list.isLoading ? <Text className="text-sm text-foreground-secondary">Chargement…</Text> : null}
      {list.data && list.data.length === 0 ? (
        <Card><CardBody><Text className="text-sm text-foreground-secondary">Aucun parrainage déclaré pour l&apos;instant.</Text></CardBody></Card>
      ) : null}

      {(list.data ?? []).map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{r.companyName ?? r.refereeName ?? r.refereeEmail}</CardTitle>
              <Badge tone={r.status === "CONVERTED" ? "warning" : r.status === "REWARDED" ? "success" : "neutral"}>
                {STATUS_LABELS[r.status] ?? r.status}
              </Badge>
            </div>
            <CardDescription>
              Filleul : {r.refereeName ?? "—"} · {r.refereeEmail} · code {r.codeUsed} · déclaré le{" "}
              {new Date(r.createdAt).toLocaleDateString("fr-FR")}
              {r.convertedAt ? ` · converti le ${new Date(r.convertedAt).toLocaleDateString("fr-FR")}` : ""}
            </CardDescription>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-2">
              <Text className="text-sm">
                Parrain :{" "}
                {r.referrer
                  ? `${r.referrer.name ?? r.referrer.email} (${r.referrer.email})`
                  : r.fanReferrer
                    ? `fan ${r.fanReferrer.handle} · ${r.fanReferrer.platform} · marque ${r.fanReferrer.brandName} (passeport ${r.fanReferrer.fanCode ?? "—"})`
                    : "compte introuvable"}
              </Text>
              {r.note ? <Text className="text-xs text-foreground-secondary">Note : {r.note}</Text> : null}
              {r.status === "PENDING" || r.status === "CONVERTED" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={noteById[r.id] ?? ""}
                    onChange={(e) => setNoteById((m) => ({ ...m, [r.id]: e.target.value }))}
                    placeholder="Note (ex : -20 % appliqué + 1 mois parrain)"
                    className="min-w-[240px] flex-1 rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                  />
                  <Button
                    size="sm"
                    disabled={reward.isPending}
                    onClick={() => reward.mutate({ id: r.id, note: noteById[r.id] || undefined })}
                  >
                    Récompenses appliquées
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate({ id: r.id, note: noteById[r.id] || undefined })}
                  >
                    Rejeter
                  </Button>
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ))}
    </section>
  );
}
