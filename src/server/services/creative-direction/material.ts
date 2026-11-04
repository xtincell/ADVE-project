import { createHash } from "node:crypto";
import type { Intent } from "@/server/services/mestor/intents";
import { buildCreativeDirectionContext } from "./context";
import type { CreativeTarget } from "@/domain/creative-direction";

type MaterialIntent = Extract<Intent,{kind:"PTAH_MATERIALIZE_BRIEF"}>;
const field = (p:Record<string,unknown>,key:string) => typeof p[key]==="string" ? String(p[key]) : undefined;

/** Seal the direction actually sent to the image provider in the original Ptah Intent.
 * Resumption keeps the same bytes or requires a new review if the doctrine changed. */
export async function conditionVisualIntent(intent:MaterialIntent): Promise<MaterialIntent> {
  if (!["image","video","design","icon","transform","refine"].includes(intent.brief.forgeSpec.kind)) return intent;
  const spec=intent.brief.forgeSpec;
  const p=spec.parameters;
  const target:CreativeTarget = {
    theme:field(p,"theme") ?? intent.brief.briefText.split("\nDIRECTION DE MARQUE ·")[0],
    angle:field(p,"angle"), format:field(p,"format"), platform:field(p,"platform"), family:field(p,"creativeFamily"),
    mode:p.creativeMode==="REVISION" ? "REVISION" : "NEW",
  };
  const doctrine=await buildCreativeDirectionContext({strategyId:intent.strategyId,target});
  const hash=doctrine ? createHash("sha256").update(doctrine.text).digest("hex") : null;
  if (intent.resumeTaskId) {
    if ((p._brandDirectionHash ?? null)!==hash) throw new Error("La direction artistique a changé. Relisez le brief avant de reprendre la génération.");
    return intent;
  }
  if ("_brandDirectionHash" in p) throw new Error("L’empreinte de direction artistique est calculée par La Fusée.");
  if (!doctrine) return intent;
  const guidance="\nDIRECTION DE MARQUE · D v"+doctrine.context.version+"\n"+doctrine.text;
  // The master lays out its own text and brand marks. The provider only draws the replaceable photo.
  if (p.productionArtwork) return {...intent,brief:{...intent.brief,
    forgeSpec:{...spec,parameters:{...p,_brandDirectionHash:hash}}}};
  const prompt=field(p,"prompt") || intent.brief.briefText;
  return {...intent,brief:{...intent.brief,briefText:intent.brief.briefText+guidance,
    forgeSpec:{...spec,parameters:{...p,prompt:prompt+guidance,_brandDirectionHash:hash}}}};
}
