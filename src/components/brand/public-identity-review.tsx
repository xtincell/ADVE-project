"use client";
import { useState } from "react";
import type { RouterOutputs } from "@/lib/trpc/client";
import { PublicIdentityChoice, PUBLIC_COLOR_ROLES, PUBLIC_MASCOT_ROLES } from "@/domain/public-brand";
import { Button, Input, Select, Textarea } from "@/components/primitives";
import { SourceReadDialog } from "./source-read-dialog";

type Options = RouterOutputs["strategy"]["publicPage"]["identityOptions"];
const colorLabels = { ink: "Encre et fond sombre", signature: "Signature", community: "Conversation et communauté", paper: "Fond clair", warm: "Chaleur", soft: "Surface douce" };
const mascotLabels = { greeting: "Accueil", curious: "Découverte", guide: "Guidage" };
const empty = (): PublicIdentityChoice => ({ referenceSourceId: "", palette: null, typography: null, mascots: null, voice: null });
const pick = (asset: Options["assets"][number]) => ({ assetId: asset.id, version: asset.version });

/** A section of the existing publication review, never a second identity editor. */
export function PublicIdentityReview({ strategyId, options, value, onChange }: {
  strategyId: string; options: Options; value: PublicIdentityChoice | null; onChange: (value: PublicIdentityChoice | null) => void;
}) {
  const [reading, setReading] = useState(false);
  const update = (patch: Partial<PublicIdentityChoice>) => onChange({ ...(value ?? empty()), ...patch });
  const assets = (kind: string) => options.assets.filter(asset => asset.kind === kind);
  const assetOptions = (kind: string) => assets(kind).map(asset => <option key={asset.id} value={asset.id}>{asset.name} — version {asset.version}</option>);
  const palette = options.assets.find(asset => asset.id === value?.palette?.assetId);
  const typography = options.assets.find(asset => asset.id === value?.typography?.assetId);
  return <div className="space-y-3 rounded border border-border p-3">
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value !== null}
      onChange={event => onChange(event.target.checked ? empty() : null)} />Inclure l’identité dans cette édition</label>
    <p className="ck-ops__note">Choisissez les éléments pour votre site. La composition et les tailles restent propres à chaque destination. Aucun actif ni document n’est validé par cette publication.</p>
    {value && <>
      <label className="block text-sm">Document de référence<Select value={value.referenceSourceId} onChange={event => update({ referenceSourceId: event.target.value })}>
        <option value="">Choisir une référence</option>{options.sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
      </Select></label>
      {value.referenceSourceId && <Button size="sm" variant="outline" onClick={() => setReading(true)}>Consulter la référence</Button>}
      {reading && value.referenceSourceId && <SourceReadDialog strategyId={strategyId} sourceId={value.referenceSourceId} onClose={() => setReading(false)} />}
      <details><summary>Couleurs par usage</summary><div className="space-y-2 pt-2">
        <label className="block text-sm">Palette<Select value={value.palette?.assetId ?? ""} onChange={event => {
          const asset = options.assets.find(a => a.id === event.target.value);
          update({ palette: asset ? { ...pick(asset), roles: Object.fromEntries(PUBLIC_COLOR_ROLES.map(role => [role, ""])) as NonNullable<PublicIdentityChoice["palette"]>["roles"] } : null });
        }}><option value="">Garder les couleurs propres au site</option>{assetOptions("CHROMATIC_STRATEGY")}</Select></label>
        {value.palette && PUBLIC_COLOR_ROLES.map(role => <label key={role} className="block text-sm">{colorLabels[role]}<Select value={value.palette!.roles[role]}
          onChange={event => update({ palette: { ...value.palette!, roles: { ...value.palette!.roles, [role]: event.target.value } } })}>
          <option value="">Choisir une couleur de la palette</option>{palette?.colors.map(color => <option key={color} value={color}>{color}</option>)}
        </Select></label>)}
      </div></details>
      <details><summary>Typographies par usage</summary><div className="space-y-2 pt-2">
        <label className="block text-sm">Système typographique<Select value={value.typography?.assetId ?? ""} onChange={event => {
          const asset = options.assets.find(a => a.id === event.target.value);
          update({ typography: asset ? { ...pick(asset), display: { family: "", faces: [] }, body: { family: "", faces: [] } } : null });
        }}><option value="">Garder les polices propres au site</option>{assetOptions("TYPOGRAPHY_SYSTEM")}</Select></label>
        {value.typography && (["display", "body"] as const).map(role => <div key={role} className="space-y-2">
          <label className="block text-sm">{role === "display" ? "Famille des titres" : "Famille du corps et de l’interface"}<Select value={value.typography![role].family}
            onChange={event => update({ typography: { ...value.typography!, [role]: { ...value.typography![role], family: event.target.value } } })}>
            <option value="">Choisir une famille</option>{typography?.families.map(family => <option key={family} value={family}>{family}</option>)}
          </Select></label>
          {(role === "display" ? [300, 400, 700] : [400, 500, 700]).map(weight => <label key={weight} className="block text-sm">{role === "display" ? "Titres" : "Corps"} — graisse {weight}<Select
            value={value.typography![role].faces.find(face => face.weight === weight)?.assetId ?? ""} onChange={event => {
              const asset = options.assets.find(a => a.id === event.target.value), faces = value.typography![role].faces.filter(face => face.weight !== weight);
              update({ typography: { ...value.typography!, [role]: { ...value.typography![role], faces: asset ? [...faces, { ...pick(asset), weight }].sort((a, b) => a.weight - b.weight) : faces } } });
            }}><option value="">Sans fichier pour cette graisse</option>{assetOptions("GENERIC")}</Select></label>)}
        </div>)}
      </div></details>
      <details><summary>Mascotte par usage</summary><div className="space-y-2 pt-2">
        <label className="block text-sm">Personnage de référence<Select value={value.mascots?.assetId ?? ""} onChange={event => {
          const asset = options.assets.find(a => a.id === event.target.value); update({ mascots: asset ? { ...pick(asset), uses: [] } : null });
        }}><option value="">Garder les illustrations propres au site</option>{assetOptions("PERSONA")}</Select></label>
        {value.mascots && PUBLIC_MASCOT_ROLES.map(role => {
          const use = value.mascots!.uses.find(use => use.role === role);
          return <div key={role} className="space-y-2"><label className="block text-sm">{mascotLabels[role]}<Select value={use?.assetId ?? ""} onChange={event => {
            const asset = options.assets.find(a => a.id === event.target.value), uses = value.mascots!.uses.filter(use => use.role !== role);
            update({ mascots: { ...value.mascots!, uses: asset ? [...uses, { ...pick(asset), role, alt: "" }] : uses } });
          }}><option value="">Sans remplacement pour cet usage</option>{assetOptions("KV_VISUAL")}</Select></label>
          {use && <label className="block text-sm">Description accessible — {mascotLabels[role]}<Input maxLength={240} value={use.alt} onChange={event => update({ mascots: { ...value.mascots!, uses: value.mascots!.uses.map(item => item.role === role ? { ...item, alt: event.target.value } : item) } })} /></label>}</div>;
        })}
      </div></details>
      <details><summary>Voix de la mascotte</summary><div className="space-y-2 pt-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!value.voice} onChange={event => update({ voice: event.target.checked ? { quote: "", attribution: "" } : null })} />Publier une citation de la référence</label>
        {value.voice && <><label className="block text-sm">Citation publique<Textarea maxLength={600} value={value.voice.quote} onChange={event => update({ voice: { ...value.voice!, quote: event.target.value } })} /></label>
          <label className="block text-sm">Attribution publique<Input maxLength={120} value={value.voice.attribution} onChange={event => update({ voice: { ...value.voice!, attribution: event.target.value } })} /></label>
          <p className="ck-ops__note">Copiez un extrait exact de la référence choisie. Le document complet et les chartes brouillon restent privés.</p></>}
      </div></details>
      {!PublicIdentityChoice.safeParse(value).success && <p className="text-sm text-warning">Complétez la référence et les usages que vous avez choisis avant de publier.</p>}
    </>}
  </div>;
}
