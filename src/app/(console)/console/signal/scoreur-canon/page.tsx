"use client";

/**
 * /console/signal/scoreur-canon — ADR-0150.
 *
 * Ratification opérateur A POSTERIORI du canon du scoreur (ADR-0149), sans
 * redéploiement : θ des ancres-étalons + jauge par échelle + items must-have.
 * Chaque édition passe par `scoreur.editCanon` (Intent gouverné SESHAT, spine
 * ADR-0124). « Preview d'impact » = re-score d'une marque sans persister.
 *
 * missionContribution: GROUND_INFRASTRUCTURE
 * groundJustification: surface opérateur interne de gouvernance du système de
 *   mesure (ratification des valeurs canon PROPOSÉES). Jamais exposée au client.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { MarketScale } from "@/domain/market-scale";
import { PageHeader } from "@/components/shared/page-header";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Badge,
  Heading,
  Text,
  Input,
} from "@/components/primitives";

const TIERS = ["FRAGILE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"] as const;
const ARENAS = ["A", "D", "V", "E", "T", "R", "TENURE"] as const;

export default function ScoreurCanonPage() {
  const canon = trpc.scoreur.getCanon.useQuery();
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const edit = trpc.scoreur.editCanon.useMutation({
    onSuccess: () => {
      setMsg("Enregistré (canon mis à jour, sans redéploiement).");
      setErr(null);
      void utils.scoreur.getCanon.invalidate();
    },
    onError: (e) => {
      setErr(e.message);
      setMsg(null);
    },
  });
  const reset = trpc.scoreur.resetCanon.useMutation({
    onSuccess: () => {
      setMsg("Réinitialisé au défaut code.");
      void utils.scoreur.getCanon.invalidate();
    },
    onError: (e) => setErr(e.message),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Scoreur — canon éditable"
        description="Ratifiez les valeurs proposées (θ des étalons, jauge, portes must-have). Édition immédiate, gouvernée, sans redéploiement."
      />

      {msg ? (
        <Badge tone="success">{msg}</Badge>
      ) : null}
      {err ? <Badge tone="error">{err}</Badge> : null}

      {/* ── Ancres θ ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Étalons — θ des ancres & items</CardTitle>
          <CardDescription>
            La seule main humaine du système : ces θ jaugent toute la mesure. Modifiez
            puis « Enregistrer ». (Échelle Elo.)
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-2">
            {(canon.data?.anchors ?? []).map((a) => (
              <AnchorRow
                key={a.slug}
                slug={a.slug}
                name={a.name}
                kind={a.kind}
                theta={a.fixedTheta ?? 0}
                onSave={(fixedTheta) => edit.mutate({ op: "SET_ANCHOR_THETA", slug: a.slug, fixedTheta })}
                busy={edit.isPending}
              />
            ))}
            {canon.isLoading ? <Text>Chargement…</Text> : null}
          </div>
        </CardBody>
      </Card>

      {/* ── Jauge par échelle ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Jauge par échelle de marché</CardTitle>
          <CardDescription>
            θ plancher (force 0) → θ icône (force max). Chaque marque est mesurée dans
            SA ligue — l&apos;icône mondiale &gt; l&apos;icône de quartier.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-2">
            {Object.entries(canon.data?.gauge ?? {}).map(([scale, g]) => (
              <GaugeRow
                key={scale}
                scale={scale}
                floor={g.floor}
                icone={g.icone}
                onSave={(floor, icone) =>
                  edit.mutate({ op: "SET_GAUGE", marketScale: scale as MarketScale, floor, icone })
                }
                onReset={() => reset.mutate({ kind: "GAUGE", key: scale })}
                busy={edit.isPending}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ── Items must-have ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Portes must-have par palier</CardTitle>
          <CardDescription>
            Les portes Michelin qui plafonnent le palier (jamais waivables). Éditez le
            palier / l&apos;arène / le libellé, retirez, ou ajoutez une porte.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-2">
            {(canon.data?.items ?? []).map((it, i) => (
              <ItemRow
                key={it.id}
                item={it}
                index={i}
                onSave={(tier, label, arena, order) =>
                  edit.mutate({ op: "SET_ITEM", itemId: it.id, tier: tier as (typeof TIERS)[number], label, arena: arena as (typeof ARENAS)[number], order })
                }
                onRemove={() => edit.mutate({ op: "REMOVE_ITEM", itemId: it.id })}
                busy={edit.isPending}
              />
            ))}
            <AddItemRow
              onAdd={(itemId, tier, label, arena) =>
                edit.mutate({ op: "SET_ITEM", itemId, tier: tier as (typeof TIERS)[number], label, arena: arena as (typeof ARENAS)[number] })
              }
              busy={edit.isPending}
            />
          </div>
        </CardBody>
      </Card>

      {/* ── Portes révélées : seuils de preuve publique ──────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Portes révélées — seuils de preuve publique</CardTitle>
          <CardDescription>
            Ce qui fait franchir les portes de bas de palier sur PREUVE PUBLIQUE mesurée (jamais le
            déclaré) : âge de domaine daté (RDAP) pour le mythe fondateur, nombre de mentions presse
            pour le market-fit. `actif-distinctif` et au-delà restent gagnés au registre.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <RevealedThresholdsRow
            mytheMinDomainAgeYears={canon.data?.revealedThresholds?.mytheMinDomainAgeYears ?? 3}
            marketFitMinPress={canon.data?.revealedThresholds?.marketFitMinPress ?? 3}
            onSave={(mytheMinDomainAgeYears, marketFitMinPress) =>
              edit.mutate({ op: "SET_REVEALED_THRESHOLDS", mytheMinDomainAgeYears, marketFitMinPress })
            }
            onReset={() => reset.mutate({ kind: "REVEALED_GATE", key: "default" })}
            busy={edit.isPending}
          />
        </CardBody>
      </Card>

      {/* ── Preview d'impact ─────────────────────────────────────────────── */}
      <PreviewCard />
    </div>
  );
}

function AnchorRow(props: { slug: string; name: string; kind: string; theta: number; onSave: (t: number) => void; busy: boolean }) {
  const [v, setV] = useState(String(props.theta));
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge tone={props.kind === "ANCHOR" ? "info" : "neutral"}>{props.kind}</Badge>
      <Text className="min-w-[220px]">{props.name}</Text>
      <Input type="number" value={v} onChange={(e) => setV(e.target.value)} className="w-32" />
      <Button
        size="sm"
        variant="outline"
        disabled={props.busy || Number(v) === props.theta}
        onClick={() => {
          const n = Number.parseFloat(v);
          if (Number.isFinite(n)) props.onSave(n);
        }}
      >
        Enregistrer
      </Button>
    </div>
  );
}

function GaugeRow(props: { scale: string; floor: number; icone: number; onSave: (f: number, i: number) => void; onReset: () => void; busy: boolean }) {
  const [f, setF] = useState(String(props.floor));
  const [i, setI] = useState(String(props.icone));
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Text className="min-w-[110px] font-medium">{props.scale}</Text>
      <Text>plancher</Text>
      <Input type="number" value={f} onChange={(e) => setF(e.target.value)} className="w-28" />
      <Text>icône</Text>
      <Input type="number" value={i} onChange={(e) => setI(e.target.value)} className="w-28" />
      <Button size="sm" variant="outline" disabled={props.busy} onClick={() => props.onSave(Number.parseFloat(f), Number.parseFloat(i))}>
        Enregistrer
      </Button>
      <Button size="sm" variant="ghost" disabled={props.busy} onClick={props.onReset}>
        Défaut
      </Button>
    </div>
  );
}

function ItemRow(props: {
  item: { id: string; tier: string; label: string; arena: string };
  index: number;
  onSave: (tier: string, label: string, arena: string, order: number) => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const [tier, setTier] = useState(props.item.tier);
  const [label, setLabel] = useState(props.item.label);
  const [arena, setArena] = useState(props.item.arena);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Text className="min-w-[180px] font-mono text-sm">{props.item.id}</Text>
      <select value={tier} onChange={(e) => setTier(e.target.value)} className="up-input">
        {TIERS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select value={arena} onChange={(e) => setArena(e.target.value)} className="up-input">
        {ARENAS.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <Input value={label} onChange={(e) => setLabel(e.target.value)} className="min-w-[220px] flex-1" />
      <Button size="sm" variant="outline" disabled={props.busy} onClick={() => props.onSave(tier, label, arena, props.index)}>
        Enregistrer
      </Button>
      <Button size="sm" variant="ghost" disabled={props.busy} onClick={props.onRemove}>
        Retirer
      </Button>
    </div>
  );
}

function AddItemRow(props: { onAdd: (id: string, tier: string, label: string, arena: string) => void; busy: boolean }) {
  const [id, setId] = useState("");
  const [tier, setTier] = useState<string>("FORTE");
  const [arena, setArena] = useState<string>("A");
  const [label, setLabel] = useState("");
  return (
    <div className="flex items-center gap-2 flex-wrap border-t pt-3" style={{ borderColor: "var(--color-border-subtle)" }}>
      <Input placeholder="id-kebab" value={id} onChange={(e) => setId(e.target.value)} className="w-40" />
      <select value={tier} onChange={(e) => setTier(e.target.value)} className="up-input">
        {TIERS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select value={arena} onChange={(e) => setArena(e.target.value)} className="up-input">
        {ARENAS.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <Input placeholder="Libellé de la porte" value={label} onChange={(e) => setLabel(e.target.value)} className="min-w-[220px] flex-1" />
      <Button
        size="sm"
        disabled={props.busy || !/^[a-z0-9-]+$/.test(id) || !label.trim()}
        onClick={() => props.onAdd(id.trim(), tier, label.trim(), arena)}
      >
        Ajouter la porte
      </Button>
    </div>
  );
}

function RevealedThresholdsRow(props: {
  mytheMinDomainAgeYears: number;
  marketFitMinPress: number;
  onSave: (mytheMinDomainAgeYears: number, marketFitMinPress: number) => void;
  onReset: () => void;
  busy: boolean;
}) {
  const [m, setM] = useState(String(props.mytheMinDomainAgeYears));
  const [p, setP] = useState(String(props.marketFitMinPress));
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Text className="min-w-[240px]">Mythe fondateur — âge de domaine min. (ans)</Text>
      <Input type="number" min={0} value={m} onChange={(e) => setM(e.target.value)} className="w-24" />
      <Text className="min-w-[220px]">Market-fit — mentions presse min.</Text>
      <Input type="number" min={1} value={p} onChange={(e) => setP(e.target.value)} className="w-24" />
      <Button
        size="sm"
        variant="outline"
        disabled={props.busy}
        onClick={() => {
          const mm = Number.parseFloat(m);
          const pp = Number.parseInt(p, 10);
          if (Number.isFinite(mm) && Number.isFinite(pp)) props.onSave(mm, pp);
        }}
      >
        Enregistrer
      </Button>
      <Button size="sm" variant="ghost" disabled={props.busy} onClick={props.onReset}>
        Défaut
      </Button>
    </div>
  );
}

function PreviewCard() {
  const [strategyId, setStrategyId] = useState("");
  const [out, setOut] = useState<string | null>(null);
  const preview = trpc.scoreur.previewBrand.useMutation({
    onSuccess: (r) =>
      setOut(
        `${r.verdict.tier} · force ${r.verdict.force}/200 · couverture ${r.verdict.coveragePct}% · cohérence ${r.verdict.coherence}` +
          (r.verdict.cappedReason ? ` — ${r.verdict.cappedReason}` : ""),
      ),
    onError: (e) => setOut(`Erreur : ${e.message}`),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview d&apos;impact</CardTitle>
        <CardDescription>Re-score une marque avec le canon courant, sans rien persister.</CardDescription>
      </CardHeader>
      <CardBody>
        <div className="flex items-center gap-3 flex-wrap">
          <Input placeholder="strategyId" value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className="w-72" />
          <Button size="sm" disabled={preview.isPending || !strategyId.trim()} onClick={() => preview.mutate({ strategyId: strategyId.trim() })}>
            Prévisualiser
          </Button>
        </div>
        {out ? (
          <div className="mt-3">
            <Heading level={4}>Résultat</Heading>
            <Text className="font-mono">{out}</Text>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
