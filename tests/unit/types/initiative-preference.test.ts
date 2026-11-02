import { describe, expect, it } from "vitest";
import { retainHumanInitiativePreferences, initiativePreference, collectNormalizedInitiatives } from "@/lib/types/pillar-schemas";
describe("catalogue preferences are separate from strategic choices", () => {
  it("keeps agent recommendations and drafts neutral", () => {
    expect(initiativePreference({ status: "RECOMMENDED" })).toBe("NEUTRAL");
    expect(initiativePreference({ status: "DRAFT" })).toBe("NEUTRAL");
  });
  it("preserves the meaning of legacy human selection and rejection", () => {
    expect(initiativePreference({ status: "SELECTED_FOR_ROADMAP" })).toBe("FAVORITE");
    expect(initiativePreference({ status: "REJECTED" })).toBe("REJECTED");
  });
  it("allows explicit neutral reintegration without falsifying the legacy status", () => {
    const rows = collectNormalizedInitiatives({ catalogueParCanal: { DIGITAL: [{
      action: "Faire tester le parcours", status: "REJECTED", preference: "NEUTRAL",
    }] } });
    expect(rows[0]).toMatchObject({ preference: "NEUTRAL", status: "REJECTED" });
  });
});

describe("regeneration preserves human preference identities",()=>{
 it("retains a rejected source by ID without inventing a new identity or changing generation input",()=>{
  const previous={catalogueParCanal:{DIGITAL:[{id:"legacy-a",action:"Old",preference:"REJECTED",budget:12}]},_fieldProvenance:{"initiatives.legacy-a.preference":"HUMAN"}};
  const candidate={catalogueParCanal:{DIGITAL:[{id:"new-b",action:"New"}]}};const before=structuredClone(candidate);
  const result=retainHumanInitiativePreferences(previous,candidate);
  expect(result.catalogueParCanal).toEqual({DIGITAL:[{id:"new-b",action:"New"},{id:"legacy-a",action:"Old",preference:"REJECTED",budget:12}]});
  expect(candidate).toEqual(before);
 });
});
