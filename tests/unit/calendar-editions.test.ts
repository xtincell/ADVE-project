import { describe, expect, it } from "vitest";
import { linkUniqueSourcePost } from "@/domain/calendar-editions";

const post = { date: "2026-10-20", platform: "Instagram", format: "Post", caption: "Copy retenue." };
const documented = { ...post, productionArtwork: { assetId: "master" } };

describe("Raccord d’un post actif à un master documentaire", () => {
  it("ne rattache une source qu’à la ligne du même jour, de même format et avec sa légende exacte", () => {
    const other = { ...post, date: "2026-10-21" };
    expect(linkUniqueSourcePost([other, post], 1, [documented])).toEqual(documented);
    for (const change of [{date:"2026-10-21"}, {platform:"Facebook"}, {format:"Story"}, {caption:"Copy réécrite."}, {caption:null}]) {
      expect(linkUniqueSourcePost([{...post,...change}], 0, [documented])).toBeNull();
    }
  });
  it("refuse une correspondance ambiguë sur le planning ou entre deux éditions", () => {
    expect(linkUniqueSourcePost([post,post], 0, [documented])).toBeNull();
    expect(linkUniqueSourcePost([post], 0, [documented,documented])).toBeNull();
  });
});
