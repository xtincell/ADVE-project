"use client";

/**
 * Console · Seshat — Argos (Hunter reference harvester). ADR-0095.
 * Récolte LLM (Hunter) + création manuelle (manual-first) + revue verdict.
 */

import * as React from "react";
import { Radar, PenLine, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { Card, CardHeader, CardBody } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { Field, FieldError } from "@/components/primitives/field";
import { Label } from "@/components/primitives/label";
import { Badge } from "@/components/primitives/badge";

const csv = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

function verdictTone(v: string) {
  return v === "PASS" ? "success" : v === "REJECT" ? "error" : "warning";
}

export default function ConsoleArgosPage() {
  const utils = trpc.useUtils();
  const list = trpc.argos.list.useQuery({});
  const invalidate = () => void utils.argos.list.invalidate();

  const hunt = trpc.argos.hunt.useMutation({ onSuccess: invalidate });
  const manual = trpc.argos.createManual.useMutation({ onSuccess: invalidate });
  const setVerdict = trpc.argos.setVerdict.useMutation({ onSuccess: invalidate });

  const [h, setH] = React.useState({ brand: "", sector: "", market: "", topics: "" });
  const [m, setM] = React.useState({ brand: "", campaign: "", sector: "", voice: "", keyPhrases: "", palette: "", axes: "", secTitle: "", secBody: "" });

  const rows = list.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Argos — Hunter</h1>
        <p className="text-sm text-muted-foreground">
          Récolte de dossiers de référence (DNA + editorial). Auto-publiés si verdict PASS.
          Hunter = sub-agent Seshat (pas un Neter). Le LLM passe par le Gateway.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hunter LLM */}
        <Card surface="raised">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Récolte Hunter (LLM)</h2>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <Field>
              <Label htmlFor="h-brand" required>Marque</Label>
              <Input id="h-brand" value={h.brand} onChange={(e) => setH({ ...h, brand: e.target.value })} placeholder="Ex. Nike" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="h-sector">Secteur</Label>
                <Input id="h-sector" value={h.sector} onChange={(e) => setH({ ...h, sector: e.target.value })} placeholder="Sportswear" />
              </Field>
              <Field>
                <Label htmlFor="h-market">Marché</Label>
                <Input id="h-market" value={h.market} onChange={(e) => setH({ ...h, market: e.target.value })} placeholder="Afrique de l'Ouest" />
              </Field>
            </div>
            <Field>
              <Label htmlFor="h-topics">Angles (optionnel)</Label>
              <Input id="h-topics" value={h.topics} onChange={(e) => setH({ ...h, topics: e.target.value })} placeholder="storytelling, claim, KV" />
            </Field>
            {hunt.isError && <FieldError>{hunt.error.message}</FieldError>}
            <div>
              <Button
                className="gap-2"
                loading={hunt.isPending}
                disabled={!h.brand}
                onClick={() => hunt.mutate({ brand: h.brand, sector: h.sector || undefined, market: h.market || undefined, topics: h.topics ? csv(h.topics) : undefined })}
              >
                <Radar className="h-4 w-4" /> Lancer la récolte
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Manuel */}
        <Card surface="raised">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Création manuelle (sans LLM)</h2>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="m-brand" required>Marque</Label>
                <Input id="m-brand" value={m.brand} onChange={(e) => setM({ ...m, brand: e.target.value })} />
              </Field>
              <Field>
                <Label htmlFor="m-campaign">Campagne</Label>
                <Input id="m-campaign" value={m.campaign} onChange={(e) => setM({ ...m, campaign: e.target.value })} />
              </Field>
            </div>
            <Field>
              <Label htmlFor="m-voice">Voix de marque</Label>
              <Textarea id="m-voice" rows={2} value={m.voice} onChange={(e) => setM({ ...m, voice: e.target.value })} />
            </Field>
            <Field>
              <Label htmlFor="m-kp">Key phrases (virgules)</Label>
              <Input id="m-kp" value={m.keyPhrases} onChange={(e) => setM({ ...m, keyPhrases: e.target.value })} placeholder="Just Do It, …" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="m-pal">Palette (virgules)</Label>
                <Input id="m-pal" value={m.palette} onChange={(e) => setM({ ...m, palette: e.target.value })} placeholder="noir, rouge" />
              </Field>
              <Field>
                <Label htmlFor="m-axes">Axes (virgules)</Label>
                <Input id="m-axes" value={m.axes} onChange={(e) => setM({ ...m, axes: e.target.value })} placeholder="dépassement de soi" />
              </Field>
            </div>
            {manual.isError && <FieldError>{manual.error.message}</FieldError>}
            <div>
              <Button
                variant="subtle"
                className="gap-2"
                loading={manual.isPending}
                disabled={!m.brand || csv(m.keyPhrases).length < 2}
                onClick={() =>
                  manual.mutate({
                    brand: m.brand,
                    campaign: m.campaign || undefined,
                    sector: m.sector || undefined,
                    dna: {
                      palette: csv(m.palette),
                      typography: [],
                      voice: m.voice,
                      visualCodes: [],
                      keyPhrases: csv(m.keyPhrases),
                      axes: csv(m.axes),
                    },
                    editorial: m.secTitle || m.secBody ? { sections: [{ title: m.secTitle || "Note", body: m.secBody || "—" }] } : { sections: [] },
                  })
                }
              >
                <PenLine className="h-4 w-4" /> Créer le dossier
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Liste + revue */}
      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--card-radius)] border border-dashed border-border bg-background-subtle px-6 py-12 text-center text-muted-foreground">
          Aucun dossier. Lance une récolte ou crée-en un manuellement.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((d) => (
            <Card key={d.id} surface="raised">
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={verdictTone(d.safetyVerdict)}>{d.safetyVerdict}</Badge>
                    {d.published && <Badge tone="success">Publié</Badge>}
                    <Badge tone="neutral">{d.origin}</Badge>
                    <span className="text-xs text-muted-foreground">/argos/{d.ref}</span>
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {d.brand}
                    {d.campaign ? ` — ${d.campaign}` : ""}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => setVerdict.mutate({ id: d.id, verdict: "PASS" })}>
                    <CheckCircle2 className="h-4 w-4" /> Publier
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => setVerdict.mutate({ id: d.id, verdict: "QUARANTINE" })}>
                    <ShieldAlert className="h-4 w-4" /> Quarantaine
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => setVerdict.mutate({ id: d.id, verdict: "REJECT" })}>
                    <XCircle className="h-4 w-4" /> Rejeter
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
