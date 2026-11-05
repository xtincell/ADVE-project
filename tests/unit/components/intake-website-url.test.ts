// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ save: vi.fn(), process: vi.fn(), refetch: vi.fn(), push: vi.fn(), watch: vi.fn(),
  row: { status: "IN_PROGRESS", companyName: "Fixture agency", websiteUrl: "www.matangaagency.com", rawText: "Agency fixture", documents: [] } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock("@/lib/i18n/use-t", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/intake/use-intake-processing-watch", () => ({ useIntakeProcessingWatch: () => ({ watching: false, stage: null, startWatching: h.watch }) }));
vi.mock("@/components/intake/received-documents", () => ({ ReceivedIntakeDocuments: () => null, readIntakeFile: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { quickIntake: {
  getByToken: { useQuery: () => ({ data: h.row, isLoading: false, refetch: h.refetch }) },
  processIngest: { useMutation: (options?: unknown) => options ? { mutate: h.process, isPending: false } : { mutateAsync: h.save } },
} } }));
import IngestIntakePage from "@/app/(intake)/intake/[token]/ingest/page";

beforeEach(() => {
  vi.stubGlobal("React", React); vi.clearAllMocks();
  h.save.mockResolvedValue({ status: "SAVED" }); h.refetch.mockResolvedValue({ data: h.row });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const open = async () => { await act(async () => { render(React.createElement(React.Suspense, {}, React.createElement(IngestIntakePage, { params: Promise.resolve({ token: "fixture-token" }) }))); }); };

describe("document intake website submission", () => {
  it("submits the naked domain shown in the screenshot as HTTPS, then launches the analysis", async () => {
    await open();
    expect((screen.getByLabelText("intakeIngest.website.label") as HTMLInputElement).value).toBe("www.matangaagency.com");
    fireEvent.click(screen.getByRole("button", { name: "intakeIngest.submit.cta" }));
    await waitFor(() => expect(h.process).toHaveBeenCalledWith({ token: "fixture-token", files: [] }));
    expect(h.save).toHaveBeenCalledWith({ token: "fixture-token", prepareOnly: true, rawText: "Agency fixture", websiteUrl: "https://www.matangaagency.com/", files: [] });
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("explains an invalid address without losing the text or address and without launching analysis", async () => {
    await open();
    fireEvent.change(screen.getByLabelText("intakeIngest.website.label"), { target: { value: "adresse invalide" } });
    fireEvent.change(screen.getByLabelText("intakeIngest.title"), { target: { value: "Mon brouillon conservé." } });
    fireEvent.click(screen.getByRole("button", { name: "intakeIngest.submit.cta" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Indiquez une adresse web valide");
    expect(screen.getByRole("alert").textContent).not.toContain('"code"');
    expect((screen.getByLabelText("intakeIngest.website.label") as HTMLInputElement).value).toBe("adresse invalide");
    expect((screen.getByLabelText("intakeIngest.title") as HTMLTextAreaElement).value).toBe("Mon brouillon conservé.");
    expect(h.save).not.toHaveBeenCalled(); expect(h.process).not.toHaveBeenCalled();
  });
  it("also renders a legacy server validation response without exposing JSON", async () => {
    h.save.mockRejectedValue(new Error('[{"code":"invalid_format","format":"url","path":["websiteUrl"],"message":"Invalid URL"}]'));
    await open();
    fireEvent.click(screen.getByRole("button", { name: "intakeIngest.submit.cta" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Site web : format invalide");
    expect(screen.getByRole("alert").textContent).not.toContain('"path"');
    expect(h.process).not.toHaveBeenCalled();
  });
});
