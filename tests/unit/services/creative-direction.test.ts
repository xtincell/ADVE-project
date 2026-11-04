import { describe, expect, it, vi } from "vitest";
import { creativeDirectionDoctrine, rulesForProduction } from "@/domain/creative-direction";
import { compileCreativeDirection } from "@/server/services/creative-direction/context";
import { conditionVisualIntent } from "@/server/services/creative-direction/material";
import type { Intent } from "@/server/services/mestor/intents";

const pillar = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { pillar: { findUnique: pillar } } }));
const sources = [{ id: "manual", label: "Manuel de la marque", locator: "Édition 3 §5" }];
const families = [
  { id: "duel", name: "Duel", purpose: "Comparer", signals: ["duel"], requirements: ["Même poids"], sources: ["manual"] },
  { id: "preuve", name: "Preuve", purpose: "Vérifier", signals: ["preuve"], requirements: ["Date"], sources: ["manual"] },
];
const doctrine = creativeDirectionDoctrine.parse({schema: "creative-direction/v1", sources, families, rules: [
  { id:"story", domain:"COMPOSITION", usage:"KEEP", guidance:"Marges de story", sources:["manual"], families:["duel"], formats:["STORY"] },
  { id:"lock", domain:"REVIEW", usage:"KEEP", guidance:"Conserver les calques", sources:["manual"], modes:["REVISION"] },
]});
const content = { tonDeVoix: { onDit:["Trouvaille"] }, directionArtistique: { univers:"Cuisine communautaire", doctrine } };

describe("Direction artistique par cible", () => {
  it("utilise le vocabulaire et la DA des anciennes marques", () => {
    expect(compileCreativeDirection({tonDeVoix:content.tonDeVoix, directionArtistique:{univers:"Paysage"}}, 3)?.text).toContain("Trouvaille");
    expect(compileCreativeDirection({tonDeVoix:content.tonDeVoix}, 3)).toBeNull();
  });
  it("ne mêle pas la story, le post et la correction, et demande la famille en cas d’égalité", () => {
    const selected = rulesForProduction(doctrine,{theme:"Un duel",format:"Story IG"});
    expect(selected.rules.map(r=>r.id)).toEqual(["story"]);
    expect(rulesForProduction(doctrine,{theme:"duel et preuve"}).decision).toBe("TO_CHOOSE");
    expect(rulesForProduction(doctrine,{family:"duel",format:"post",mode:"REVISION"}).rules.map(r=>r.id)).toEqual(["lock"]);
  });
  it("choisit un gabarit et des pistes graphiques indépendamment et conserve les exclusions",()=>{
    const base={scope:"Matrice datée, avis artistique",rationale:"Piste, à vérifier",technique:"PNG",sources:["manual"]};
    const withGraphics=creativeDirectionDoctrine.parse({...doctrine,graphicAssets:[
      {...base,id:"companion",name:"Mascotte",advice:"KEEP",signals:["mascotte"],members:[{path:"Assets/companion.png",sha256:"a".repeat(64)}]},
      {...base,id:"palace",name:"Palace",advice:"OUT",signals:["palace"],members:[]},
      {...base,id:"mask",name:"Masque",advice:"UTILITY",signals:["masque"],members:[]},
    ]});
    const chosen=rulesForProduction(withGraphics,{theme:"duel avec mascotte, sans palace ni masque"});
    expect(chosen.family?.id).toBe("duel");
    expect(chosen.graphicAssetSuggestions.map(a=>a.id)).toEqual(["companion"]);
    expect(chosen.excludedGraphicAssetMentions.map(a=>a.id).sort()).toEqual(["mask","palace"]);
    const noMascot=rulesForProduction(withGraphics,{theme:"Un duel, sans mascotte."});
    expect(noMascot.graphicAssetSuggestions).toEqual([]);
    expect(noMascot.excludedGraphicAssetMentions[0]?.reason).toBe("BRIEF_EXCLUDES");
    expect(rulesForProduction(withGraphics,{theme:"Une mascotte"}).decision).toBe("TO_CHOOSE");
    expect(rulesForProduction(withGraphics,{theme:"Un duel"}).graphicAssetSuggestions).toEqual([]);
  });
  it("transmet et scelle la version du D utilisée jusque dans le prompt de la forge", async () => {
    pillar.mockResolvedValue({content, currentVersion:3});
    const intent = { kind:"PTAH_MATERIALIZE_BRIEF",strategyId:"brand",operatorId:"operator",sourceIntentId:"intent",brief:{briefText:"Composer un duel",pillarSource:"D",manipulationMode:"entertainer",forgeSpec:{kind:"image",parameters:{prompt:"Photographie",format:"story",creativeFamily:"duel"}}}} as Extract<Intent,{kind:"PTAH_MATERIALIZE_BRIEF"}>;
    const send = await conditionVisualIntent(intent);
    expect(send.brief.forgeSpec.parameters.prompt).toContain("Marges de story");
    expect(send.brief.forgeSpec.parameters.prompt).toContain("Photographie");
    expect((await conditionVisualIntent({...send,resumeTaskId:"task"})).brief).toEqual(send.brief);
    pillar.mockResolvedValue({content, currentVersion:4});
    await expect(conditionVisualIntent({...send,resumeTaskId:"task"})).rejects.toThrow(/changé/);
  });
});
