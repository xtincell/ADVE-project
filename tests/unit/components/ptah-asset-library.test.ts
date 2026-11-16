import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASSET_BRAND_OBSERVATION, readAssetBrandObservation } from "@/domain/asset-brand-observation";

const state = vi.hoisted(() => ({ data: [] as unknown[] }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { ptah: { listForges: { useQuery: () => ({ data: state.data, isLoading: false }) } } } }));
vi.mock("next/image", () => ({ default: () => null }));
import { PtahAssetLibrary } from "@/components/neteru/ptah-asset-library";

const proof = () => ({
  schema: ASSET_BRAND_OBSERVATION, assetVersionId: "version-1", strategyId: "brand-1",
  publication: { packageId: "package-1", packageHash: "a".repeat(64), actionId: "action-1",
    socialPostId: "post-1", connectionId: "connection-1", externalPostId: "ig-post-1", publishedAt: "2026-11-13T12:00:00.000Z" },
  before: { id: "before", measuredAt: "2026-11-13T11:00:00.000Z", score: 20 },
  after: { id: "after", measuredAt: "2026-11-14T12:00:00.000Z", score: 18 },
  delta: -2,
});
let metadata: Record<string, unknown>;
beforeEach(() => {
  metadata = {};
  state.data = [{ id: "task-1", forgeKind: "image", provider: "provider", providerModel: "model", pillarSource: "I",
    manipulationMode: "entertainer", estimatedCostUsd: 1, realisedCostUsd: 1, expectedSuperfans: 100,
    realisedSuperfans: 20, status: "COMPLETED",
    versions: [{ id: "version-1", url: "/image.jpg", cdnUrl: null, kind: "image", cultIndexDeltaObserved: 99, metadata }] }];
});
const render = () => renderToStaticMarkup(React.createElement(PtahAssetLibrary, { strategyId: "brand-1" }));

describe("asset gallery evidence", () => {
  it("hides legacy asset effects and cost-per-superfan claims without a publication observation", () => {
    const html = render();
    expect(html).not.toContain("Évolution globale"); expect(html).not.toContain("99.0");
    expect(html).not.toContain("/sf"); expect(html).not.toContain("20 sf");
  });
  it("shows the proven signed brand variation, samples and limits independently of the legacy numeric column", () => {
    metadata.brandVariationObservation = proof();
    const html = render();
    expect(html).toContain("Évolution globale de la marque : -2.0 points");
    expect(html).toContain("20.0"); expect(html).toContain("18.0");
    expect(html).toContain("Publication reçue le 13/11/2026");
    expect(html).toContain("d’autres actions peuvent y contribuer");
    expect(html).not.toContain("99.0"); expect(html).not.toContain("/sf");
  });
  it.each(["assetVersionId", "strategyId"] as const)("hides another asset or brand's proof (%s)", key => {
    metadata.brandVariationObservation = { ...proof(), [key]: "foreign" };
    expect(render()).not.toContain("Évolution globale");
  });
  it("rejects an inconsistent delta or snapshots outside the observation window", () => {
    metadata.brandVariationObservation = { ...proof(), delta: 99 };
    expect(readAssetBrandObservation(metadata, "version-1", "brand-1")).toBeNull();
    const invalid = proof(); invalid.after.measuredAt = "2026-11-14T11:59:59.999Z";
    metadata.brandVariationObservation = invalid;
    expect(render()).not.toContain("Évolution globale");
    invalid.after.measuredAt = "2026-11-14T12:00:00.000Z"; invalid.before.measuredAt = invalid.publication.publishedAt;
    expect(render()).not.toContain("Évolution globale");
  });
});
