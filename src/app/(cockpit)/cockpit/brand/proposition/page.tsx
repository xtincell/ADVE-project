"use client";

import { ADVE_STORAGE_KEYS } from "@/domain";

import { useState, useEffect, useMemo } from "react";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { useCanOperate } from "@/components/cockpit/use-can-operate";
import { useToast } from "@/components/shared/notification-toast";
import { trpc } from "@/lib/trpc/client";
import {
  FileText,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";
import { ArtemisLaunchModal } from "@/components/cockpit/artemis-launch-modal";
import { RtisCascadeModal } from "@/components/cockpit/rtis-cascade-modal";
import { OracleProgressivePanel } from "@/components/cockpit/oracle/progressive-panel";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";

interface BlockerHint {
  pillarKey: string;
  reasons: readonly string[];
  missingFields?: readonly string[];
}

export default function PropositionPage() {
  const strategyId = useCurrentStrategyId();
  const toast = useToast();
  // Assemblage/cascade = gestes opérateur ; le founder lit et exporte
  // (UX-DR16, lot 12 — cohérence avec le panel progressif déjà gardé).
  const canOperate = useCanOperate();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  // Dépose du legacy enrichOracle (ADR-0125) : l'assemblage passe par
  // l'orchestrateur manual-first `oracle.assembleOracle` (ADR-0071) ; le
  // détail par section vit dans le panel progressif SSE (ADR-0073).
  const [isAssembling, setIsAssembling] = useState(false);
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [cascadeModalOpen, setCascadeModalOpen] = useState(false);
  const [externalBlockers, setExternalBlockers] = useState<BlockerHint[] | undefined>(undefined);

  // Audit 2026-07-16 `oracle-dual-status-truth` : le héro (completeness) et le
  // panel progressif (OracleSection.status) racontaient deux vérités
  // contradictoires sur le MÊME écran (« 97 % assemblé » vs « 35 périmés »).
  // Le héro consomme désormais AUSSI la fraîcheur des sections.
  const oracleSections = trpc.oracle.listSections.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );
  const completeness = trpc.strategyPresentation.completeness.useQuery(
    { strategyId: strategyId ?? "" },
    {
      enabled: !!strategyId,
      // 3s poll during Artemis runs (live progression). Outside Artemis, poll
      // every 60s in background so derived sections (plan-activation,
      // production-livrables, budget, timeline-gouvernance, conditions-etapes)
      // pass to "complete" naturellement quand leur données amont changent
      // (campagnes créées sur /cockpit/operate, contracts ajoutés, etc.).
      refetchInterval: isAssembling ? 3000 : 60000,
      // Refetch on window focus : si user édite des données dans un autre tab
      // puis revient sur Oracle, le report se met à jour immédiatement.
      refetchOnWindowFocus: true,
    }
  );

  // Maturity report — used to compute "RTIS ready ?" (green/red Lancer button)
  // and to auto-prompt the cascade when ADVE hits 100% with RTIS still empty.
  const maturity = trpc.pillar.maturityReport.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId, refetchOnWindowFocus: false },
  );

  const adveAllComplete = useMemo(() => {
    const p = maturity.data?.pillars as Record<string, { currentStage?: string }> | undefined;
    if (!p) return false;
    return (ADVE_STORAGE_KEYS).every((k) => {
      const stage = p[k]?.currentStage;
      return stage === "ENRICHED" || stage === "COMPLETE";
    });
  }, [maturity.data]);

  const rtisReady = useMemo(() => {
    const p = maturity.data?.pillars as Record<string, { currentStage?: string }> | undefined;
    if (!p) return false;
    return (["r", "t", "i", "s"] as const).every((k) => {
      const stage = p[k]?.currentStage;
      return stage === "ENRICHED" || stage === "COMPLETE";
    });
  }, [maturity.data]);

  // "Oracle prêt à compiler" = ADVE ENRICHED+ ET RTIS ENRICHED+. RTIS seul ne
  // suffit pas : le gate ORACLE_ENRICH veto si ADVE est sous-ENRICHED, et
  // l'ArtemisLaunchModal montrerait un DIAGNOSE en contradiction avec un
  // bouton vert. Bouton vert = vraie promesse "compile sans heurt".
  const oracleReadyToCompile = adveAllComplete && rtisReady;

  // Une modale s'ouvrait SEULE au chargement (une fois par marque, mémorisée en
  // localStorage) pour proposer la cascade. Arriver sur une page et se faire
  // interrompre par une boîte qu'on n'a pas demandée, c'est le genre de moment
  // où l'écran devient illisible — d'autant que rien n'expliquait d'où elle
  // venait. La même information est désormais portée, en clair et en
  // permanence, par la carte « Piliers stratégiques » et par le bouton
  // « Préparer la stratégie ». Le geste reste à l'utilisateur.

  const assembleMutation = trpc.oracle.assembleOracle.useMutation({
    onMutate: () => {
      setIsAssembling(true);
    },
    onSuccess: (data) => {
      completeness.refetch();
      const d = data as { status?: string; generated?: number; failed?: number };
      if (d.status === "EMPTY") {
        toast.info("Rien à assembler — toutes les sections ciblées sont déjà à jour.");
      } else if (typeof d.failed === "number" && d.failed > 0) {
        toast.error(`Assemblage terminé avec ${d.failed} section(s) en échec — voir le panel de génération ci-dessous.`);
      } else {
        toast.success("Assemblage terminé — les sections sont à jour.");
      }
    },
    onError: (err) => {
      toast.error(`L'assemblage a échoué : ${err.message}`);
    },
    onSettled: () => setIsAssembling(false),
  });

  const shareMutation = trpc.strategyPresentation.shareLink.useMutation({
    onSuccess: (data) => setShareUrl(data.url),
  });

  if (!strategyId) {
    return (
      <div className="flex h-96 items-center justify-center text-foreground-muted">
        Selectionnez une strategie pour acceder a la proposition.
      </div>
    );
  }

  const report = completeness.data ?? {};
  const totalSections = SECTION_REGISTRY.length;
  const completeSections = Object.values(report).filter((s) => s === "complete").length;
  const partialSections = Object.values(report).filter((s) => s === "partial").length;
  const emptySections = Object.values(report).filter((s) => s === "empty").length;
  const staleSections = (Array.isArray(oracleSections.data) ? [] : (oracleSections.data?.sections ?? []))
    .filter((s) => s.status === "STALE").length;

  // ── Ce qu'il faut avant que le diagnostic tienne debout ──
  // Ces trois cartes parlaient en interne : « au moins ENRICHED » (une valeur
  // d'énumération), « la cascade R+T → I → S » (le nom du pipeline). Le porteur
  // de marque n'a aucun moyen de savoir ce qu'on lui demande. Elles disent
  // désormais ce qui manque et à quoi ça sert.
  const readinessCards = [
    {
      key: "adve", title: "Vos fondations",
      ready: adveAllComplete,
      body: adveAllComplete
        ? "Qui vous êtes, ce qui vous distingue, ce que vous valez, comment vous engagez : les quatre fondations de votre marque sont posées."
        : "Renseignez les quatre fondations de votre marque — ADVE, Architecture des Expériences. Tout le diagnostic se déduit d'elles.",
    },
    {
      key: "rtis", title: "Votre lecture stratégique",
      ready: rtisReady,
      body: rtisReady
        ? "Diagnostic, marché, actions et stratégie ont été déduits de vos fondations."
        : "Déduisez de vos fondations votre diagnostic, votre marché, vos actions et votre stratégie.",
    },
    {
      key: "oracle", title: "Votre diagnostic",
      ready: oracleReadyToCompile,
      body: oracleReadyToCompile
        ? `${completeSections} de ses ${totalSections} sections sont complètes — le document est prêt à être ouvert et partagé.`
        : "Disponible dès que vos fondations et votre lecture stratégique sont en place.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <FileText className="h-7 w-7 text-accent" />
          L&apos;Oracle — votre diagnostic de marque
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Document vivant de {SECTION_REGISTRY.length} sections, réévalué à chaque évolution de votre marque.
        </p>
      </div>

      {/* ─ Synthèse vivante (hero) — données réelles ─ */}
      <div className="ck-oracle-hero">
        <div className="ck-oracle-hero__glow" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ck-oracle-hero__rocket" src="/brand/illustrations/rocket-3d.png" alt="" />
        <span className="ck-oracle-hero__eyebrow"><Sparkles /> Synthèse vivante · réévaluée en continu</span>
        {/* Le chiffre mis en avant est celui de la MATIÈRE (sections qui
            contiennent tout ce qu'on en attend), pas celui des générations
            réussies — les deux étaient appelés « assemblé » indifféremment. */}
        <h2 className="ck-oracle-hero__h">
          {completeSections === totalSections
            ? <>Votre diagnostic est <span className="hl">complet</span> — les {totalSections} sections disent tout ce qu&apos;elles ont à dire.</>
            : <><span className="hl">{completeSections}</span> de vos {totalSections} sections sont complètes — {totalSections - completeSections} restent à approfondir.</>}
        </h2>
        {staleSections > 0 && (
          <p className="ck-oracle-hero__p">
            {staleSections} section{staleSections > 1 ? "s" : ""} à réactualiser : un pilier de votre marque a
            changé depuis leur rédaction. Reprenez-les dans la liste ci-dessous.
          </p>
        )}
        <p className="ck-oracle-hero__p">
          Chaque section est un volet de conseil rédigé à partir de vos piliers de marque. Vous pouvez l&apos;ouvrir, l&apos;exporter et le partager à tout moment.
          {isAssembling ? " Rédaction en cours — les sections se mettent à jour en temps réel." : ""}
        </p>
        {/* Un seul jeu de compteurs sur la page. Il portait « Complètes /
            Partielles / Vides / Assemblé % » ici, puis « X complètes /
            Y partielles / Z vides » cinq centimètres plus bas, puis encore
            « X complets / Y ratés / Z périmés » dans le panneau. */}
        <div className="ck-oracle-hero__stats">
          <div><span className="k">Complètes</span><b className="text-success">{completeSections}/{totalSections}</b></div>
          <div><span className="k">À approfondir</span><b>{partialSections}</b></div>
          <div><span className="k">À produire</span><b>{emptySections}</b></div>
        </div>
      </div>

      {/* ─ 3 cartes de préparation — état réel de la cascade ─ */}
      <div className="ck-grid--3">
        {readinessCards.map((c) => {
          const Icon = c.ready ? CheckCircle : AlertCircle;
          return (
            <div className="ck-oracle-card" key={c.key}>
              <span className="ck-oracle-card__ic" style={c.ready ? { background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" } : undefined}><Icon /></span>
              <h3 className="ck-oracle-card__t">{c.title}</h3>
              <p className="ck-oracle-card__b">{c.body}</p>
            </div>
          );
        })}
      </div>

      {/* ─ Assembleur + console live. Lot 13 (audit 2026-07-11 [M05-01]) :
          une seule surface d'assemblage visible du founder — l'outillage
          (console, tracker, partage personas) est opérateur-only ; le
          founder garde stats, « Ouvrir le livrable » et le panel progressif. ─ */}
      <div className="ck-orc">
        <div className="ck-orc__head">
          <div className="ck-orc__head-l">
            <h3>Votre livrable</h3>
            <AiBadge />
          </div>
        </div>

        {/* Ce bouton n'a JAMAIS assemblé — dans les trois branches il ouvrait une
            modale de préparation. Il s'appelait pourtant « Assembler la
            proposition » quand tout était prêt, en doublon du vrai assembleur du
            panneau ci-dessous. Il ne s'affiche donc plus que lorsqu'une
            préparation est réellement requise, et il dit laquelle. */}
        <div className="ck-orc__controls">
          {canOperate && !oracleReadyToCompile ? (
          <button
            className="ck-orc__assemble"
            title={
              !adveAllComplete
                ? "Vos 4 fondations ne sont pas encore enrichies — ouvre la préparation."
                : "Vos piliers stratégiques ne sont pas encore dérivés — ouvre la préparation."
            }
            onClick={() => {
              if (!adveAllComplete) { setExternalBlockers(undefined); setLaunchModalOpen(true); return; }
              setCascadeModalOpen(true);
            }}
          >
            <AlertCircle />
            {!adveAllComplete ? "Préparer la fondation" : "Préparer la stratégie"}
          </button>
          ) : null}
          <button
            className="ck-orc__preview"
            disabled={shareMutation.isPending}
            onClick={async () => {
              // Le premier clic créait le lien SANS rien ouvrir : le porteur
              // cliquait, il ne se passait rien, il recliquait. On attend le
              // lien puis on ouvre — un clic, un résultat.
              if (shareUrl) { window.open(shareUrl, "_blank"); return; }
              try {
                const res = await shareMutation.mutateAsync({ strategyId: strategyId! });
                window.open(res.url, "_blank");
              } catch {
                toast.error("Le lien du livrable n'a pas pu être créé. Réessayez dans un instant.");
              }
            }}
          >
            {shareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink />}
            Ouvrir le livrable
          </button>
        </div>

        {/* La barre de progression vit dans le panneau, alimentée par le flux
            temps réel (section courante, échecs). Celle qui était ici affichait
            un pourcentage de MATIÈRE pendant une génération — deux barres, deux
            unités, sur le même écran. */}

        {/* ─ Lien public / partage (strategyPresentation.shareLink) — geste
            opérateur (vues persona destinées au partage vers le client). ─ */}
        {canOperate ? (
        <div className="ck-orc__share">
          <div className="ck-orc__share-l">
            <span className="ck-orc__share-h"><Share2 /> Page générée — lien public</span>
            <span className="ck-orc__share-s">Livrable partageable au client. Choisissez la vue (persona) à partager.</span>
          </div>
          <div className="ck-orc__share-personas">
            {(["consultant", "client", "creative"] as const).map((persona) => (
              <button key={persona} disabled={shareMutation.isPending} onClick={() => shareMutation.mutate({ strategyId: strategyId!, persona })}>
                {shareMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 />}{persona}
              </button>
            ))}
          </div>
          {shareUrl && (
            <div className="ck-orc__share-row">
              <code className="ck-orc__share-url">{typeof window !== "undefined" ? window.location.origin : ""}{shareUrl}</code>
              <button className="ck-orc__share-copy" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <><Check /> Copié</> : <><Copy /> Copier</>}
              </button>
              <a className="ck-orc__share-open" href={shareUrl} target="_blank" rel="noopener"><ExternalLink /> Prévisualiser</a>
            </div>
          )}
        </div>
        ) : null}
      </div>

      {/* ─ LA grille des 35 sections (ADR-0073) ─
          Il y en avait DEUX, empilées : celle-ci, et une seconde juste en
          dessous alimentée par `strategyPresentation.completeness`. Les deux
          affichaient les mêmes 35 sections avec la même pastille verte et le
          même mot « Complète », alors qu'elles mesurent des faits différents —
          « le job de génération a tourné » contre « la section contient de la
          matière ». Mesuré sur SPAWT : 35 COMPLETE en haut, 21 complètes /
          13 partielles / 1 vide en bas, dans le même écran.
          Une seule grille désormais, et la matière y est dite sous son propre
          nom (« nourrie » / « à étoffer » / « sans matière »). */}
      <OracleProgressivePanel strategyId={strategyId} contentFillById={report} />

      {/* Export PDF (server-side jspdf walk) */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={async () => {
            if (!strategyId) return;
            try {
              const res = await fetch(`/api/export/oracle/${strategyId}/pdf`);
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(err.error ?? "Export failed");
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "oracle.pdf";
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            } catch (e) {
              console.error("[export-pdf] failed:", e);
              toast.error("L'export PDF a échoué. Réessayez dans un instant.");
            }
          }}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background"
        >
          <FileText className="h-4 w-4" /> Export PDF
        </button>
        <button
          onClick={async () => {
            if (!strategyId) return;
            try {
              const res = await fetch(`/api/export/brand-bible/${strategyId}/pdf`);
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(err.error ?? "Export failed");
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "bible-de-marque.pdf";
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            } catch (e) {
              console.error("[export-brand-bible] failed:", e);
              toast.error("Le téléchargement de la bible de marque a échoué. Réessayez dans un instant.");
            }
          }}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background"
        >
          <FileText className="h-4 w-4" /> Bible de marque (16:9)
        </button>
      </div>

      <ArtemisLaunchModal
        open={launchModalOpen}
        onOpenChange={setLaunchModalOpen}
        strategyId={strategyId}
        onLaunch={() => assembleMutation.mutate({ strategyId, scope: "MISSING" })}
        externalBlockers={externalBlockers}
      />

      <RtisCascadeModal
        open={cascadeModalOpen}
        onOpenChange={setCascadeModalOpen}
        strategyId={strategyId}
        onCompleted={() => {
          // Cascade succeeded — refresh maturity so the button flips green
          // immediately, before localStorage flag matters.
          void maturity.refetch();
        }}
      />
    </div>
  );
}
