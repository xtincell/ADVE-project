"use client";

/**
 * Console · L'Arène — Modération des missions La Guilde (ADR-0098).
 * File des missions déposées par les marques sur le portail public, en attente
 * de validation opérateur avant publication sur le mur.
 */

import * as React from "react";
import { CheckCircle2, XCircle, MapPin, Wallet, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { Card, CardBody } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Textarea } from "@/components/primitives/textarea";

function formatBudget(amount: number | null) {
  return amount == null ? null : `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export default function GuildMissionModerationPage() {
  const utils = trpc.useUtils();
  const pending = trpc.laGuilde.listPendingModeration.useQuery();
  const decide = trpc.laGuilde.publishMission.useMutation({
    onSuccess: () => {
      void utils.laGuilde.listPendingModeration.invalidate();
      setRejectingId(null);
      setNote("");
    },
  });

  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");

  const rows = pending.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Missions La Guilde — modération</h1>
        <p className="text-sm text-muted-foreground">
          Missions déposées par les marques sur le portail public. Publiez-les sur le mur ou
          rejetez-les (motif tracé).
        </p>
      </header>

      {pending.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--card-radius)] border border-dashed border-border bg-background-subtle px-6 py-16 text-center text-muted-foreground">
          Aucune mission en attente de modération.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((m) => (
            <Card key={m.id} surface="raised">
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{m.categoryLabel}</Badge>
                      <span className="text-xs text-muted-foreground">{m.brandName}</span>
                    </div>
                    <h2 className="font-semibold text-foreground">{m.title}</h2>
                    <p className="text-sm text-foreground-secondary">{m.summary}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      loading={decide.isPending && decide.variables?.missionId === m.id && decide.variables?.decision === "PUBLISH"}
                      onClick={() => decide.mutate({ missionId: m.id, decision: "PUBLISH" })}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Publier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() => setRejectingId(rejectingId === m.id ? null : m.id)}
                    >
                      <XCircle className="h-4 w-4" /> Rejeter
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  {m.sector && <span>Secteur : {m.sector}</span>}
                  {m.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {m.location}
                    </span>
                  )}
                  {formatBudget(m.budget) && (
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" /> {formatBudget(m.budget)}
                    </span>
                  )}
                  {m.contactEmail && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> {m.contactEmail}
                    </span>
                  )}
                </div>

                {rejectingId === m.id && (
                  <div className="flex flex-col gap-2 rounded-[var(--card-radius)] border border-border-subtle p-3">
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Motif du rejet (transmis à titre de trace interne)…"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        loading={decide.isPending && decide.variables?.decision === "REJECT"}
                        onClick={() => decide.mutate({ missionId: m.id, decision: "REJECT", note: note.trim() || undefined })}
                      >
                        Confirmer le rejet
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
