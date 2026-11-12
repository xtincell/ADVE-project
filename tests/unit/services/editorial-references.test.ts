import { describe, expect, it } from "vitest";
import { isOperationalCalendar } from "@/domain/calendar-editions";
import { channelDeclaration, prepareEditorialEvidence, recordedSchedule, type EditorialSource } from "@/server/services/artemis/tools/editorial-references";
import { composeContentCalendar, composeSocialCopy, type GloryComposerContext } from "@/server/services/artemis/tools/glory-composers";
import { contentCalendarOutputSchema } from "@/server/services/artemis/tools/launch-social-schemas";

const month = "2026-11";
const date = "2026-11-12T19:30:00.000Z";
const caption = "Le groupe a choisi. Et toi ?\n\nComposition illustrée.";
function source(id:string, tags:string[], text:string):EditorialSource {
  return {id, contentHash:"a".repeat(64), edition:2, label:id+".txt", tags, text};
}
const channels = source("canaux",["Canaux officiels"],"Site officiel déclaré : https://atelier.example/\nInstagram : https://instagram.com/atelier\nAndroid : APK disponible.\niOS : en préparation.");
const schedule = source("novembre",["Calendrier social","Versions programmées"],date+" | instagram | post-1\nStatut : scheduled\n"+caption);
const plan = source("plan",["Planning","Novembre"],"Plan de novembre 2026 proposé. Douze diffusions à arbitrer.");
const context:GloryComposerContext={strategy:{id:"brand",name:"Atelier",countryCode:"CI",businessContext:null},pillars:{},editorial:{month,sources:[channels,schedule,plan],playbook:true}};

describe("Sources du Playbook Engagement",()=>{
  it("reprend le site déclaré et le profil exact même lorsque le nom et le pays suggèrent un autre domaine",()=>{
    const copy=composeSocialCopy(context);
    expect(copy.profiles).toEqual(expect.arrayContaining([expect.objectContaining({platform:"Instagram",handle:"@atelier",link:"https://atelier.example/"}),expect.objectContaining({platform:"TikTok",handle:null})]));
    expect(channelDeclaration([],undefined).website).toBeNull();
    expect(channelDeclaration([],"https://site-intake.example/").website).toBe("https://site-intake.example/");
    expect(channelDeclaration([channels,{...channels,text:"Site officiel déclaré : https://contradictoire.example/"}],"https://fallback.example/").website).toBeNull();
  });
  it("préserve le texte complet, l’heure, le statut déclaré et la source exacte dans le résultat du schéma final",()=>{
    const out=contentCalendarOutputSchema.parse(composeContentCalendar(context));
    expect(out.posts).toHaveLength(1);
    expect(out.posts[0]).toMatchObject({date:"2026-11-12",platform:"Instagram",caption,status:"scheduled",externalPostId:"post-1",scheduledOrPublishedAt:date,source:{sourceId:"novembre",edition:2}});
    expect(out.calendarRole).toBe("EXTERNAL_SCHEDULE_SNAPSHOT");
    expect(out.sources?.map(s=>s.sourceId)).toEqual(["plan","novembre"]);
    expect(out.cadenceParCanal).toEqual({});
  });
  it("conserve une référence de plan sans inventer des publications quand la programmation reste à documenter",()=>{
    const out=contentCalendarOutputSchema.parse(composeContentCalendar({...context,editorial:{month,sources:[plan],playbook:true}}));
    expect(out.posts).toEqual([]);expect(out.sources?.[0]?.sourceId).toBe("plan");
  });
  it("assemble les canaux séparément, déduplique les copies identiques et refuse les conflits ou extractions partielles",()=>{
    const fb={...schedule,id:"autre",text:schedule.text.replace("instagram","facebook")};
    expect(recordedSchedule([schedule,schedule,fb],month)).toHaveLength(2);
    expect(()=>recordedSchedule([schedule,{...schedule,text:schedule.text+"!"}],month)).toThrow(/vérifier/);
    expect(()=>recordedSchedule([{...schedule,text:schedule.text+"\n----\nligne incomplète"}],month)).toThrow(/vérifier/);
    expect(recordedSchedule([schedule],"2027-01")).toEqual([]);
  });
  it("transmet les sources de disponibilité et le statut du plan aux textes comme aux diagnostics",()=>{
    const e=prepareEditorialEvidence([channels,schedule,plan],month);
    expect(e.brief).toContain("iOS : en préparation");expect(e.brief).toContain("Douze diffusions à arbitrer");
    expect(e.citations.map(s=>s.sourceId)).toEqual(["canaux","novembre","plan"]);
  });
  it("écarte du planning actif les productions Playbook actuelles, historiques ou en cours, et les copies externes",()=>{
    const row={toolSlug:"content-calendar-strategist",output:{},execution:null};
    expect(isOperationalCalendar(row)).toBe(true);
    expect(isOperationalCalendar({...row,execution:{sequenceKey:"PLAYBOOK-E"}})).toBe(false);
    for(const role of ["EXTERNAL_SCHEDULE_SNAPSHOT","PLAYBOOK_PROPOSAL"])expect(isOperationalCalendar({...row,output:{calendarRole:role}})).toBe(false);
    expect(isOperationalCalendar({...row,toolSlug:"editorial-calendar-edition"})).toBe(false);
  });
});
