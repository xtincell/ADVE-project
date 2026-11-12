/** Source-backed art-direction rules and graphic assets applicable to a production target. */
import { z } from "zod";

const label = z.string().trim().min(1).max(500);
const ids = z.array(z.string().min(1)).min(1).max(32);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
// Source recommendations about reusable artwork. These are not post templates or human approvals.
const graphicAssetFamily = z.object({
  id: label, name: label, scope: label, advice: z.enum(["KEEP", "REWORK", "UTILITY", "OUT"]),
  rationale: label, technique: label, signals: z.array(label).max(24), sources: ids,
  members: z.array(z.object({path: label, sha256: digest})).max(32),
});
export const creativeDirectionDoctrine = z.object({
  schema: z.literal("creative-direction/v1"),
  sources: z.array(z.object({ id: label, label, locator: label, driveId: label.optional(), sha256: z.string().regex(/^[a-f0-9]{64}$/).optional() })).min(1).max(128),
  graphicAssets: z.array(graphicAssetFamily).max(128).optional(),
  families: z.array(z.object({ id: label, name: label, purpose: label, signals: z.array(label).max(30), requirements: z.array(label).max(16), sources: ids })).min(1).max(48),
  rules: z.array(z.object({
    id: label, domain: z.enum(["VOICE","CULTURE","IDENTITY","COMPOSITION","EVIDENCE","REVIEW"]),
    usage: z.enum(["KEEP","ADAPT","EXCLUDE","VERIFY"]), guidance: label, sources: ids,
    families: ids.optional(), formats: z.array(z.enum(["POST","STORY","CAROUSEL","VIDEO","PRINT"])).optional(),
    modes: z.array(z.enum(["NEW","REVISION"])).optional(),
  })).min(1).max(192),
}).superRefine((doc,ctx) => {
  const sourceIds = new Set(doc.sources.map(s=>s.id));
  const familyIds = new Set(doc.families.map(s=>s.id));
  if (sourceIds.size !== doc.sources.length || familyIds.size !== doc.families.length || new Set(doc.rules.map(r=>r.id)).size !== doc.rules.length) ctx.addIssue({code:"custom",message:"Identifiants de doctrine en double."});
  const graphics=doc.graphicAssets ?? [];
  if (new Set(graphics.map(row=>row.id)).size!==graphics.length) ctx.addIssue({code:"custom",message:"Identifiants d’actifs graphiques en double."});
  for (const row of [...doc.families, ...doc.rules, ...graphics]) if (row.sources.some(s=>!sourceIds.has(s))) ctx.addIssue({code:"custom",message:`Source de doctrine introuvable pour ${row.id}.`});
  for (const rule of doc.rules) if (rule.families?.some(f=>!familyIds.has(f))) ctx.addIssue({code:"custom",message:`Famille introuvable pour ${rule.id}.`});
});
export type CreativeDirectionDoctrine = z.infer<typeof creativeDirectionDoctrine>;
export interface CreativeTarget {
  platform?: string; format?: string; theme?: string; angle?: string; family?: string; mode?: "NEW"|"REVISION";
}
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
export function creativeFormat(text: string) {
  const format=normalize(text);
  if (/\bstor(?:y|ies)\b/.test(format)) return "STORY";
  if (/\b(?:carrousel|carousel)\b/.test(format)) return "CAROUSEL";
  if (/\b(?:reel|reels|video|clip)\b/.test(format)) return "VIDEO";
  if (/\b(?:print|affiche|ooh)\b/.test(format)) return "PRINT";
  return "POST";
}
export function rulesForProduction(doc: CreativeDirectionDoctrine, target: CreativeTarget) {
  const subject = " "+normalize([target.theme,target.angle,target.format].filter(Boolean).join(" "))+" ";
  const scores = doc.families.map(family=>({family,score:family.signals.filter(signal=>subject.includes(" "+normalize(signal)+" ")).length})).sort((a,b)=>b.score-a.score);
  const best = scores[0];
  const inferred = best && best.score > 0 && best.score !== scores[1]?.score ? best.family : undefined;
  const explicit = target.family ? doc.families.find(f=>f.id===target.family) : undefined;
  if (target.family && !explicit) throw new Error("La famille d’exécution sélectionnée ne figure plus dans la doctrine de marque.");
  const family=explicit ?? inferred;
  const format=target.format ? creativeFormat(target.format) : undefined;
  const mode=target.mode ?? "NEW";
  const rules=doc.rules.filter(r=>(!r.families || (!!family && r.families.includes(family.id)))
    && (!r.formats || (!!format && r.formats.includes(format))) && (!r.modes || r.modes.includes(mode)));
  const graphicMatches = (doc.graphicAssets ?? []).map(asset=>{
    let strength=0, forbidden=false;
    for (const raw of asset.signals) {
      const signal=normalize(raw), marker=" "+signal+" ";
      for (let start=subject.indexOf(marker); start!==-1; start=subject.indexOf(marker,start+1)) {
        strength=Math.max(strength,signal.length);
        // Explicit exclusions in a brief override the matrix even when the family remains active there.
        if (/(?:^| )(?:sans|sauf|exclure|eviter|interdire|pas de|pas d|ne pas utiliser)(?: (?:la|le|les|l|de|du|d|un|une))?$/.test(subject.slice(0,start))) forbidden=true;
      }
    }
    return {asset,strength,forbidden};
  }).filter(({strength})=>strength>0).sort((a,b)=>b.strength-a.strength || a.asset.id.localeCompare(b.asset.id));
  // A documented family without original bytes is never suggested for use. References are proposals to review, not embedded images.
  const graphicAssetSuggestions=graphicMatches.filter(({asset:a,forbidden})=>!forbidden&&(a.advice==="KEEP"||a.advice==="REWORK")&&a.members.length>0).slice(0,3).map(x=>x.asset);
  const excludedGraphicAssetMentions=graphicMatches.filter(({asset:a,forbidden})=>forbidden||a.advice==="OUT"||a.advice==="UTILITY"||!a.members.length).slice(0,3)
    .map(({asset:{id,name,scope,advice,rationale,sources},forbidden})=>({id,name,scope,advice,rationale,sources,reason:forbidden?"BRIEF_EXCLUDES":advice==="OUT"||advice==="UTILITY"?"NOT_ACTIVE":"NO_ORIGINAL"}));
  const used=new Set([...rules.flatMap(r=>r.sources), ...(family?.sources ?? []),...graphicAssetSuggestions.flatMap(a=>a.sources),...excludedGraphicAssetMentions.flatMap(a=>a.sources)]);
  return {family:family ?? null,decision:explicit?"SELECTED":inferred?"PROPOSED":"TO_CHOOSE",format:format??null,mode,rules,graphicAssetSuggestions,excludedGraphicAssetMentions,sources:doc.sources.filter(s=>used.has(s.id))};
}
