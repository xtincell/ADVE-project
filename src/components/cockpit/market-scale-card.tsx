/**
 * MarketScaleCard — déclaration de l'échelle de marché (ADR-0126).
 *
 * Trois faits DÉCLARÉS par le porteur de la marque (jamais auto-écrits) :
 * échelle de marché, audience adressable, année de fondation. Ils étalonnent
 * le score : les preuves attendues d'une marque de quartier ne sont pas
 * celles d'une marque nationale, et le palier s'affiche avec son référentiel.
 *
 * Founder-editable (la déclaration appartient au porteur) — la mutation
 * `strategy.update` porte déjà la garde d'ownership.
 */

"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/shared/notification-toast";
import { MARKET_SCALES, type MarketScale } from "@/domain";

const SCALE_OPTIONS: ReadonlyArray<{ value: MarketScale; label: string }> = [
  { value: "QUARTIER", label: "Quartier" },
  { value: "VILLE", label: "Ville" },
  { value: "REGION", label: "Région" },
  { value: "NATION", label: "Nation" },
  { value: "CONTINENT", label: "Continent" },
  { value: "MONDE", label: "Monde" },
];

const inputCls =
  "w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

const PLATFORM_SHORT: Record<string, string> = {
  FACEBOOK: "FB", INSTAGRAM: "IG", TIKTOK: "TikTok",
  YOUTUBE: "YT", TWITTER: "X", LINKEDIN: "LinkedIn",
};

export function MarketScaleCard({ strategyId }: { strategyId: string }) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const strategyQuery = trpc.strategy.getWithScore.useQuery({ id: strategyId }, { enabled: !!strategyId });
  // Suggestion issue des relevés RÉELS des réseaux connectés — lecture pure.
  const suggestion = trpc.strategy.getAudienceSuggestion.useQuery(
    { strategyId },
    { enabled: !!strategyId },
  );

  const [scale, setScale] = useState<MarketScale | "">("");
  const [audience, setAudience] = useState<string>("");
  const [founded, setFounded] = useState<string>("");
  // Pays + secteur — LES clés de la veille marché (external-feeds, intelligence
  // sectorielle, axe Overton). Aucune surface cockpit ne permettait de les
  // poser sur une marque existante (audit 2026-07-16) : veille morte.
  const [country, setCountry] = useState<string>("");
  const [sector, setSector] = useState<string>("");

  const s = strategyQuery.data as
    | { marketScale?: MarketScale | null; addressableAudience?: number | null; brandFoundedYear?: number | null; countryCode?: string | null; businessContext?: unknown }
    | undefined;

  useEffect(() => {
    if (!s) return;
    setScale(s.marketScale ?? "");
    setAudience(s.addressableAudience != null ? String(s.addressableAudience) : "");
    setFounded(s.brandFoundedYear != null ? String(s.brandFoundedYear) : "");
    setCountry(s.countryCode ?? "");
    const bc = (s.businessContext ?? null) as { sector?: unknown } | null;
    setSector(typeof bc?.sector === "string" ? bc.sector : "");
  }, [s]);

  const updateMutation = trpc.strategy.update.useMutation({
    onSuccess: () => {
      toast.success("Échelle de marché enregistrée — votre score est désormais étalonné à votre terrain.");
      void utils.strategy.getWithScore.invalidate({ id: strategyId });
    },
    onError: (err) => toast.error(err.message || "Enregistrement impossible."),
  });

  const currentYear = new Date().getFullYear();
  const audienceNum = audience.trim() === "" ? null : Number(audience);
  const foundedNum = founded.trim() === "" ? null : Number(founded);
  const audienceInvalid = audienceNum != null && (!Number.isInteger(audienceNum) || audienceNum <= 0);
  const foundedInvalid = foundedNum != null && (!Number.isInteger(foundedNum) || foundedNum < 1800 || foundedNum > currentYear);
  const countryInvalid = country.trim() !== "" && !/^[A-Za-z]{2}$/.test(country.trim());

  const save = () => {
    if (audienceInvalid || foundedInvalid || countryInvalid) return;
    updateMutation.mutate({
      id: strategyId,
      marketScale: scale === "" ? null : scale,
      addressableAudience: audienceNum,
      brandFoundedYear: foundedNum,
      countryCode: country.trim() === "" ? null : country.trim().toUpperCase(),
      sector: sector.trim() === "" ? null : sector.trim(),
    });
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-background-raised p-5">
      <div className="mb-1 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background-overlay">
          <Globe2 className="h-4.5 w-4.5 text-accent" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Échelle de marché</p>
          <p className="text-sm text-foreground-secondary">
            Votre terrain de jeu déclaré — le score et ses preuves sont étalonnés à cette échelle,
            pas à celle d&apos;une multinationale.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-foreground-muted">Échelle</span>
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value as MarketScale | "")}
            className={inputCls}
          >
            <option value="">Non déclarée</option>
            {SCALE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-foreground-muted">Audience adressable</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="ex. 250000"
            className={inputCls}
          />
          {audienceInvalid ? <span className="mt-1 block text-2xs text-error">Entier positif attendu.</span> : null}
          {/* Suggestion factuelle (amendement ADR-0126) : PRÉ-REMPLIT le champ,
              c'est le bouton Enregistrer du porteur qui déclare — jamais
              d'écriture automatique. */}
          {suggestion.data && s?.addressableAudience == null ? (
            <span className="mt-1 block text-2xs text-foreground-muted">
              Votre communauté mesurée : <strong>{suggestion.data.suggested.toLocaleString("fr-FR")}</strong>
              {" "}({suggestion.data.perPlatform.map((p) => `${PLATFORM_SHORT[p.platform] ?? p.platform} ${p.followerCount.toLocaleString("fr-FR")}`).join(" · ")})
              — un plancher réel pour votre audience adressable.{" "}
              <button
                type="button"
                className="text-accent underline-offset-2 hover:underline"
                onClick={() => setAudience(String(suggestion.data!.suggested))}
              >
                Utiliser cette valeur
              </button>
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-foreground-muted">Année de fondation</span>
          <input
            type="number"
            min={1800}
            max={currentYear}
            inputMode="numeric"
            value={founded}
            onChange={(e) => setFounded(e.target.value)}
            placeholder={`ex. ${currentYear - 6}`}
            className={inputCls}
          />
          {foundedInvalid ? <span className="mt-1 block text-2xs text-error">Entre 1800 et {currentYear}.</span> : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-foreground-muted">Pays (code)</span>
          <input
            type="text"
            maxLength={2}
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            placeholder="ex. CM"
            className={inputCls}
          />
          {countryInvalid ? <span className="mt-1 block text-2xs text-error">Code pays à 2 lettres (ex. CM, CI).</span> : null}
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-foreground-muted">Secteur</span>
          <input
            type="text"
            maxLength={120}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="ex. Équipement audiovisuel"
            className={inputCls}
          />
          <span className="mt-1 block text-2xs text-foreground-muted">
            Pays + secteur activent votre veille marché et votre intelligence sectorielle.
          </span>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {strategyQuery.isLoading ? (
          <span className="h-8 w-24 animate-pulse rounded-lg bg-background-overlay" />
        ) : (
          <button
            onClick={save}
            disabled={updateMutation.isPending || audienceInvalid || foundedInvalid || countryInvalid}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        )}
      </div>
    </div>
  );
}
