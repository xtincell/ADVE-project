// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { PtahKilnTracker } from "@/components/neteru/ptah-kiln-tracker";

const h = vi.hoisted(() => ({ rows: [] as any[], mutate: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { ptah: {
  listForges: { useInfiniteQuery: (input: unknown) => { h.query(input); return { data: { pages: [h.rows] }, refetch: vi.fn() }; } },
  listProviderHealth: { useQuery: () => ({ data: { health: [], knownProviders: [] } }) },
  materializeBrief: { useMutation: () => ({ mutate: h.mutate }) },
} } }));
const fixture = () => ({ id: "task-1", status: "COMPLETED", forgeKind: "image", briefTitle: "Première trouvaille", campaignTitle: null,
  provider: "openai", providerModel: "Luna", createdAt: new Date("2026-11-05T10:00:00Z"), realisedCostUsd: null, estimatedCostUsd: 0,
  sourceBrandAssetId: "brief-1", submissionUnknown: false, canResume: true,
  versions: [{ id: "result-1", kind: "image", url: "/api/production/image/result-1", cdnUrl: null, width: 1080, height: 1920,
    createdAt: new Date("2026-11-05T10:01:00Z") }] });
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("React", React); h.rows = [fixture()]; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = () => render(React.createElement(PtahKilnTracker, { strategyId: "brand-1" }));

describe("Studio received production files", () => {
  it("opens the real file and source dossier without submitting production or approving it", () => {
    show();
    expect(h.query).toHaveBeenCalledWith({ strategyId: "brand-1", limit: 20, status: undefined });
    expect(screen.getByRole("img").getAttribute("src")).toBe("/api/production/image/result-1");
    expect(screen.getByText(/1080 × 1920/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Consulter le résultat 1" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("img").getAttribute("src")).toBe("/api/production/image/result-1");
    expect(dialog.getByRole("link", { name: "Ouvrir le fichier original" }).getAttribute("href")).toBe("/api/production/image/result-1?download=1");
    expect(dialog.getByRole("link", { name: "Ouvrir le brief et ses sources" }).getAttribute("href")).toBe("/cockpit/brand/assets?strategy=brand-1&asset=brief-1");
    expect(dialog.getByText(/ne vaut pas validation éditoriale/)).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(h.mutate).not.toHaveBeenCalled();
  });
  it("does not invent a result when the supplier has not supplied a file", () => {
    h.rows[0].versions = []; show();
    expect(screen.getByText(/aucun fichier reçu/)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("button", { name: /Consulter le résultat/ })).toBeNull();
  });
  it("does not render an active file link from an unsafe provider URL", () => {
    h.rows[0].versions[0].url = "javascript:alert(1)";
    h.rows[0].versions[0].cdnUrl = "data:text/html,<script>bad</script>";
    show();
    expect((screen.getByRole("button", { name: "Consulter le résultat 1" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Adresse du fichier à vérifier")).toBeTruthy();
  });
  it.each(["video", "audio"])("reads a received %s with controls and no autoplay", kind => {
    h.rows[0].versions[0] = { ...h.rows[0].versions[0], kind, url: "https://media.example.test/result", width: null, height: null };
    show(); fireEvent.click(screen.getByRole("button", { name: "Consulter le résultat 1" }));
    const media = screen.getByRole("dialog").querySelector(kind) as HTMLMediaElement;
    expect(media.controls).toBe(true); expect(media.autoplay).toBe(false);
    expect(h.mutate).not.toHaveBeenCalled();
  });
  it("drops the old brand preview when the tracked brand changes", () => {
    const view = show(); fireEvent.click(screen.getByRole("button", { name: "Consulter le résultat 1" }));
    h.rows = []; view.rerender(React.createElement(PtahKilnTracker, { strategyId: "brand-2" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("link", { name: "Ouvrir le brief et ses sources" })).toBeNull();
  });
});
