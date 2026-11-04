import {z} from "zod";

export const productionModes=["peddler","dealer","facilitator","entertainer"] as const;
export type ProductionMode=typeof productionModes[number];
export const modeLabels:Record<ProductionMode,string>={peddler:"Transaction",dealer:"Habitude",facilitator:"Utilité",entertainer:"Divertissement"};
const percent=z.number().int().min(0).max(100);
export const mixDecision=z.object({
  primary:z.enum(productionModes),percent:z.object({peddler:percent,dealer:percent,facilitator:percent,entertainer:percent}).strict(),
  expected:z.string().regex(/^[a-f0-9]{64}$/),reason:z.string().trim().min(8).max(600),confirm:z.literal(true),
}).strict().superRefine((x,ctx)=>{
  const values=Object.values(x.percent);
  if(values.reduce((a,b)=>a+b,0)!==100)ctx.addIssue({code:"custom",message:"Les quatre poids doivent totaliser 100 %."});
  if(x.percent[x.primary]<=0 || x.percent[x.primary]!==Math.max(...values))ctx.addIssue({code:"custom",message:"Choisissez un mode principal parmi les poids les plus élevés."});
});
export const object=(v:unknown):Record<string,unknown>=>v!==null && typeof v==="object" && !Array.isArray(v)?v as Record<string,unknown>:{};
export function readMixDecision(value:unknown){
  const mix=object(value),review=object(mix.review);
  const weights=productionModes.map(mode=>mix[mode]);
  const hasWeights=weights.every(n=>typeof n==="number" && Number.isFinite(n) && n>=0 && n<=1) && Math.abs(weights.reduce<number>((a,n)=>a+Number(n),0)-1)<0.00001;
  const primary=productionModes.find(mode=>mode===mix.primary) ?? null;
  const revision=review.status==="HUMAN_REVIEWED" && typeof review.version==="number" && review.version>0?review.version:0;
  return {primary,version:revision,percent:hasWeights ? Object.fromEntries(productionModes.map(m=>[m,Math.round(Number(mix[m])*100)])) as Record<ProductionMode,number>:null,
    reason:typeof review.reason==="string"?review.reason:"",at:typeof review.at==="string"?review.at:null};
}

const signals:Record<ProductionMode,RegExp>={
  facilitator:/aide.*(?:choisir|décid)|décision|choix éclairé|simplif|guid(?:er|e)\b|vérifiable|résoudre|tutoriel/i,
  entertainer:/divertissement|jeu\b|spectacle|humour|faire rire|ludique|mème/i,
  dealer:/habitude|rituel|rétention|fidélis|répétition|retour régulier/i,
  peddler:/achat immédiat|vente directe|passer commande|promotion|conversion transactionnelle|offre limitée/i,
};
const fields:Record<string,string[]>={a:["purpose","brandPurpose","vision","mission","brandPromise","promise"],d:["positioning","positioningStatement","promesse","positionnement","distinction"],v:["valueProposition","propositionDeValeur","businessModel","offre","promesse"],e:["experiencePromise","promesseExperience","primaryChannel","promesse","promesse_experience","engagementPromise"]};
export function suggestMix(pillars:Array<{key:string;content:unknown}>,prior:unknown){
  const points={peddler:0,dealer:0,facilitator:0,entertainer:0};
  const evidence:Array<{field:string;excerpt:string;mode:ProductionMode}>=[];
  for(const row of [...pillars].sort((a,b)=>a.key.localeCompare(b.key))){
    const key=row.key.toLowerCase(),content=object(row.content);
    for(const name of fields[key]??[]){
      const text=content[name];if(typeof text!=="string"||!text.trim())continue;
      for(const mode of productionModes){
        const match=signals[mode].exec(text);
        if(!match)continue;
        points[mode]++;const from=Math.max(0,match.index-45);
        evidence.push({field:key.toUpperCase()+"."+name,excerpt:text.slice(from,from+145).trim(),mode});
      }
    }
  }
  const previous=readMixDecision(prior);
  const ranked=[...productionModes].sort((a,b)=>points[b]-points[a]);
  const dominant=ranked[0]!;
  let percent:Record<ProductionMode,number>, primary:ProductionMode|null;
  if(previous.percent){
    percent=previous.percent;const sorted=[...productionModes].sort((a,b)=>percent[b]-percent[a]);
    primary=previous.primary??(percent[sorted[0]!]!==percent[sorted[1]!] ? sorted[0]! : null);
  }else if(points[dominant]){
    // Planning rule: spread a baseline across all four modes, allocate the remainder by ADVE evidence.
    const total=productionModes.reduce((n,m)=>n+points[m],0);
    percent=Object.fromEntries(productionModes.map(m=>[m,10+Math.floor(60*points[m]/total)])) as Record<ProductionMode,number>;
    percent[dominant]+=100-Object.values(percent).reduce((a,b)=>a+b,0);
    primary=points[dominant]>points[ranked[1]!] ? dominant : null;
  }else{
    percent={peddler:25,dealer:25,facilitator:25,entertainer:25};primary=null;
  }
  const basis=previous.version?"DECISION":previous.percent?"LEGACY":evidence.length?"ADVE":"POSTULAT";
  const reason=previous.reason || (basis==="ADVE" ? "Proposition de répartition fondée sur les passages ADVE cités, à arbitrer pour la production." : basis==="LEGACY" ? "Répartition existante à relire pour la production." : "");
  return {percent,primary,basis,reason,evidence,previous};
}
