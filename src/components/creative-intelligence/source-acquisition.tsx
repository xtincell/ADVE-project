"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { collectCreativeSourceSchema, creativeSourceSchema, creativeExportSchema } from "@/domain/creative-sources";
import { Button } from "@/components/primitives/button";
import { Card, CardBody } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Textarea } from "@/components/primitives/textarea";
import { Label } from "@/components/primitives/label";

const labels = { BLUESKY: "Bluesky public", YOUTUBE: "YouTube Data API", FOREPLAY: "Foreplay Discovery", CONNECTED_SOCIAL: "Publications de la marque connectée" };
export function CreativeSourceAcquisition({ strategyId, sector, countryCode }: { strategyId: string; sector: string; countryCode: string }) {
  const utils = trpc.useUtils();
  const sources = trpc.argos.intelligence.sourceCapabilities.useQuery();
  const automation = trpc.argos.intelligence.watchAutomation.useQuery({ strategyId }, { enabled: !!strategyId });
  const [provider, setProvider] = useState("BLUESKY");
  const [account, setAccount] = useState("");
  const [format, setFormat] = useState("VIDEO_UNCLASSIFIED");
  const [json, setJson] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const onSuccess = (data: unknown) => { setResult(JSON.stringify(data, null, 2)); setError(""); void utils.argos.intelligence.invalidate(); };
  const onError = (e: { message: string }) => { setError(e.message); setResult(""); };
  const collect = trpc.argos.intelligence.collectSource.useMutation({ onSuccess, onError });
  const imp = trpc.argos.intelligence.importExport.useMutation({ onSuccess, onError });
  const refresh = trpc.argos.intelligence.refreshWatchlist.useMutation({ onSuccess, onError });
  const setAuto = trpc.argos.intelligence.setWatchAutomation.useMutation({ onSuccess, onError });
  const parse = (fn: () => void) => { try { fn(); } catch (e) { onError({ message: e instanceof Error ? e.message : "Saisie invalide." }); } };
  return <Card><CardBody className="space-y-3">
    <h3 className="font-semibold">Collecter les sources et suivre les comptes</h3>
    <p className="text-sm text-muted-foreground">Le secteur et le pays viennent du contexte de collecte renseigné ci-dessous. Ils ne décrivent pas une audience géographique mesurée. Chaque nouveau passage conserve ses relevés ; aucun historique rétroactif n'est inventé.</p>
    <div className="grid gap-3 md:grid-cols-2">
      <Label>Source<Select value={provider} onChange={e => setProvider(e.target.value)}>{creativeSourceSchema.options.map(p => <option key={p} value={p}>{labels[p]}</option>)}</Select></Label>
      <Label>Compte ou recherche<Input value={account} onChange={e => setAccount(e.target.value)} placeholder={provider === "YOUTUBE" ? "UC… ou @handle" : provider === "FOREPLAY" ? "Recherche de publicités" : provider === "BLUESKY" ? "handle.bsky.social ou did:…" : "Identifiant natif du compte connecté"} /></Label>
    </div>
    {provider === "YOUTUBE" && <Label>Format déclaré des vidéos du lot<Select value={format} onChange={e => setFormat(e.target.value)}><option value="VIDEO_UNCLASSIFIED">Non classé — aucun ratio de surperformance</option><option value="LONG_VIDEO">Vidéo standard — lot homogène déclaré</option><option value="SHORT_VIDEO">Short — lot homogène déclaré</option></Select><span className="text-xs text-muted-foreground">L'API ne fournit pas de drapeau Short fiable. Pour une chaîne mixte, utiliser un export avec le format renseigné par vidéo.</span></Label>}
    <Button loading={collect.isPending} disabled={!account.trim() || !sector.trim()} onClick={() => parse(() => collect.mutate(collectCreativeSourceSchema.parse({ provider, account, sector, countryCode, youtubeFormat: format, ...(strategyId ? { strategyId } : {}) })))}>Collecter et conserver les observations</Button>
    {!!strategyId && <div className="space-y-2 border-t border-border pt-3">
      <p className="text-sm">Veille automatique : {automation.data?.enabled ? "activée" : "désactivée ou état en cours de lecture"}. Comptes YouTube UC… et Bluesky did:… de la liste de veille ; deux comptes par passage. Les comptes non pris en charge sont signalés dans le résultat.</p>
      <div className="flex flex-wrap gap-2"><Button loading={refresh.isPending} onClick={() => refresh.mutate({ strategyId })}>Actualiser la liste de veille</Button><Button variant="outline" loading={setAuto.isPending} disabled={!automation.data} onClick={() => setAuto.mutate({ strategyId, enabled: !automation.data?.enabled })}>{automation.data?.enabled ? "Désactiver la collecte automatique" : "Activer la collecte automatique"}</Button></div>
    </div>}
    <details><summary className="cursor-pointer text-sm font-medium">Importer un export sourcé — autres fournisseurs ou archives</summary><div className="space-y-2 pt-2"><p className="text-xs text-muted-foreground">Format creative-source-export-v1 : strategyId du périmètre et items contenant specimen et, si réellement mesurée, measurement. Cinquante éléments maximum. Le lot entier est validé avant enregistrement.</p><Textarea aria-label="Export créatif JSON" value={json} onChange={e => setJson(e.target.value)} /><Button loading={imp.isPending} disabled={!json.trim()} onClick={() => parse(() => { const data = creativeExportSchema.parse(JSON.parse(json)); if (data.strategyId !== (strategyId || undefined)) throw new Error("L'export doit appartenir au périmètre affiché."); imp.mutate(data); })}>Valider et importer l'export</Button></div></details>
    <a href="/console/anubis/credentials" className="text-sm text-accent underline">Configurer les accès YouTube, Foreplay et Argos-studio</a>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    {result && <pre role="status" className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{result}</pre>}
    <details><summary className="cursor-pointer font-medium">Couverture des sources et conditions d'accès</summary><ul className="space-y-2 pt-2">{sources.data?.map(s => <li key={s.id} className="text-sm"><a href={s.docs} target="_blank" rel="noopener noreferrer" className="text-accent underline">{s.name}</a> · {s.path === "DIRECT" ? "adaptateur direct — accès à vérifier" : s.path === "EXISTING_CONNECTION" ? "connexion existante" : s.path.startsWith("EXISTING") ? "radar existant" : "contrat à qualifier / export"}<p className="text-xs text-muted-foreground">{s.provides}</p></li>)}</ul>{sources.error && <p role="alert">Couverture indisponible.</p>}</details>
  </CardBody></Card>;
}
