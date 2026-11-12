// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PtahForgeButton } from "@/components/neteru/ptah-forge-button";

const harness = vi.hoisted(() => ({
  me: { data: { canOperate: true }, isLoading: false },
  useMutation: vi.fn(),
  mutate: vi.fn(),
  toast: vi.fn(),
  error: vi.fn(),
  response: {
    status: "OK", summary: "Request recorded", reason: null as string | null,
    output: {} as Record<string, unknown>, brandAssetId: "source-fixture", message: "",
  },
}));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  auth: { me: { useQuery: () => harness.me } },
  strategyPresentation: { forgeForSection: { useMutation: harness.useMutation } },
} }));
vi.mock("@/components/shared/notification-toast", () => ({
  useToast: () => ({ toast: harness.toast, error: harness.error }),
}));

function show() {
  return render(React.createElement(PtahForgeButton, {
    strategyId: "strategy-fixture", sectionId: "manipulation-matrix",
    brandAssetKind: "MANIPULATION_MATRIX", forgeKind: "image", label: "Produire le visuel",
  }));
}
function confirm() {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Produire le visuel" }));
  fireEvent.click(screen.getByRole("button", { name: /Confirmer la (?:forge|demande)/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Next transforms JSX automatically; the unit runner uses classic JSX.
  vi.stubGlobal("React", React);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0); return 0;
  });
  harness.me = { data: { canOperate: true }, isLoading: false };
  harness.response = {
    status: "OK", summary: "Request recorded", reason: null,
    output: { taskId: "task-fixture", provider: "openai", status: "DEFERRED" },
    brandAssetId: "source-fixture", message: "",
  };
  harness.useMutation.mockImplementation((options) => {
    harness.mutate.mockImplementation(() => options.onSuccess(harness.response));
    return { isPending: false, mutate: harness.mutate };
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Manual production receipt", () => {
  it("does not mount the mutation for a founder", () => {
    harness.me.data.canOperate = false;
    show();
    expect(screen.queryByRole("button", { name: "Produire le visuel" })).toBeNull();
    expect(screen.getByText(/pris en charge par votre équipe/)).toBeTruthy();
    expect(harness.useMutation).not.toHaveBeenCalled();
    expect(harness.mutate).not.toHaveBeenCalled();
  });

  it("does not mount the mutation until operator rights are known", () => {
    harness.me.isLoading = true;
    show();
    expect(screen.queryByRole("button", { name: "Produire le visuel" })).toBeNull();
    expect(harness.useMutation).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before sending the request", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Produire le visuel" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(harness.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(harness.mutate).not.toHaveBeenCalled();
  });

  it("shows a deferred request without a production success or an automatic retry promise", () => {
    harness.response.output.estimatedCostUsd = 0;
    confirm();
    expect(harness.mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByText("En attente de configuration")).toBeTruthy();
    expect(screen.getByText(/Aucune production n’a démarré/)).toBeTruthy();
    expect(harness.toast).toHaveBeenLastCalledWith(expect.stringMatching(/Aucune production/), "warning");
    expect(document.body.textContent).not.toMatch(/webhook|AssetVersion|automatiquement|reprise automatique/);
    expect(document.body.textContent).not.toContain("$0.000");
    expect(document.querySelector('[class*="badge-bg-success"]')).toBeNull();
  });

  it("separates an accepted request from a production that is running", () => {
    harness.response.output.status = "IN_PROGRESS";
    confirm();
    expect(screen.getByText("Demande acceptée")).toBeTruthy();
    expect(screen.getByText("Production en cours")).toBeTruthy();
    expect(harness.toast).toHaveBeenLastCalledWith(expect.any(String), "info");
    expect(document.querySelector('[class*="badge-bg-success"]')).toBeNull();
  });

  it("does not call a newly recorded request a delivered asset", () => {
    harness.response.output.status = "CREATED";
    confirm();
    expect(screen.getByText("Demande enregistrée")).toBeTruthy();
    expect(document.querySelector('[class*="badge-bg-success"]')).toBeNull();
  });

  it.each([undefined, "FUTURE_STATE"])("keeps an unconfirmed production state honest (%s)", (status) => {
    harness.response.output.status = status;
    confirm();
    expect(screen.getByText("État de production non confirmé")).toBeTruthy();
    expect(document.querySelector('[class*="badge-bg-success"]')).toBeNull();
  });

  it("does not take an emission veto for an accepted production request", () => {
    harness.response.status = "VETOED";
    harness.response.reason = "Capacity unavailable";
    confirm();
    expect(screen.getByText("Demande refusée")).toBeTruthy();
    expect(screen.queryByText("Demande acceptée")).toBeNull();
    expect(document.querySelector('[class*="badge-bg-success"]')).toBeNull();
  });
});
