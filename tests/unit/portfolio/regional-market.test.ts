import { describe, it, expect } from "vitest";
import { mapContexteDefi } from "@/server/services/strategy-presentation/section-mappers";
import {
  subjectSourcesFor,
  brandPressFeedFor,
} from "@/server/services/seshat/external-feeds/feed-sources";
import { deriveWatchContext } from "@/server/services/seshat/external-feeds/watch-subjects";
import { buildBrandFeedTopics } from "@/server/services/seshat/external-feeds/brand-feed";

describe("regional brand dossiers", () => {
  it("carries market scope and client headquarters separately through the Oracle", () => {
    const s = {
      countryCode: null,
      marketScale: "REGION",
      businessContext: { marketRegion: "Afrique de l’Ouest et du Centre" },
      pillars: [],
      client: { country: "CI" },
    };
    expect(mapContexteDefi(s)).toMatchObject({
      market: {
        countryCode: null,
        region: "Afrique de l’Ouest et du Centre",
        scaleLabel: "échelle régionale",
      },
      client: { country: "CI" },
    });
    expect(
      mapContexteDefi({ ...s, marketScale: null, businessContext: {} }).market,
    ).toEqual({ countryCode: null, region: null, scaleLabel: null });
  });
  it("searches declared regions and issues multilingual RSS without a fabricated geographic edition", () => {
    const scope = "Afrique de l’Ouest et du Centre";
    const watch = deriveWatchContext({ countryName: scope });
    const topics = buildBrandFeedTopics(
      { name: "Groupe de test", sector: "Lait", extraSubjects: [] },
      watch,
    );
    expect(topics.some((t) => t.query.includes(scope))).toBe(true);
    for (const source of [
      ...subjectSourcesFor("lait", null),
      brandPressFeedFor("Peak", null),
    ]) {
      expect(new URL(source.url).searchParams.has("gl")).toBe(false);
      expect(new URL(source.url).searchParams.has("ceid")).toBe(false);
    }
    expect(
      new URL(subjectSourcesFor("lait", "NG")[0]!.url).searchParams.get("gl"),
    ).toBe("NG");
  });
});
