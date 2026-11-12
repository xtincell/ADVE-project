// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  create: vi.fn(),
  attach: vi.fn(),
  invalidate: vi.fn(),
  select: vi.fn(),
  push: vi.fn(),
  error: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("@/components/cockpit/strategy-context", () => ({
  useStrategy: () => ({ setStrategyId: m.select }),
}));
vi.mock("@/components/shared/notification-toast", () => ({
  useToast: () => ({ error: m.error }),
}));
vi.mock("@/components/shared/confirm-dialog", () => ({
  ConfirmDialog: (p: any) =>
    p.open
      ? React.createElement("button", { onClick: p.onConfirm }, "Confirmer")
      : null,
}));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({
      brandNode: { invalidate: m.invalidate },
      strategy: { invalidate: m.invalidate },
    }),
    strategy: { create: { useMutation: () => ({ mutateAsync: m.create }) } },
    brandNode: {
      attachStrategy: { useMutation: () => ({ mutateAsync: m.attach }) },
    },
  },
}));
import { BrandPlatformCta } from "@/components/portfolio/BrandPlatformCta";
const props = {
  nodeId: "peak-ng",
  nodeName: "Peak Nigeria",
  nodeKind: "REGIONAL_BRAND",
  operatorId: "op",
  clientId: "wamco",
  strategyId: null,
  countryCode: "NG",
  updatedAt: new Date("2026-11-06T00:00:00Z"),
};
beforeEach(() => {
  vi.clearAllMocks();
  m.create.mockResolvedValue({ id: "new-ng" });
  m.attach.mockResolvedValue({ ok: true });
});
afterEach(cleanup);
function confirm() {
  fireEvent.click(
    screen.getByRole("button", {
      name: /Créer la plateforme|Reprendre le rattachement/,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
}
it("carries the explicit country into the platform and uses the observed node version", async () => {
  render(React.createElement(BrandPlatformCta, props));
  confirm();
  await waitFor(() => expect(m.push).toHaveBeenCalled());
  expect(m.create).toHaveBeenCalledWith({
    name: "Peak Nigeria",
    operatorId: "op",
    clientId: "wamco",
    country: "NG",
    portfolioNode: {
      nodeId: "peak-ng",
      expectedUpdatedAt: "2026-11-06T00:00:00.000Z",
    },
  });
  expect(m.attach).not.toHaveBeenCalled();
  expect(m.select).toHaveBeenCalledWith("new-ng");
});
it("reuses the same durable node key after a lost response and full page reload", async () => {
  m.create.mockRejectedValueOnce(new Error("Network error"));
  const first = render(React.createElement(BrandPlatformCta, props));
  confirm();
  await waitFor(() => expect(m.error).toHaveBeenCalled());
  first.unmount();
  render(React.createElement(BrandPlatformCta, props));
  confirm();
  await waitFor(() => expect(m.push).toHaveBeenCalled());
  expect(m.create.mock.calls[0]).toEqual(m.create.mock.calls[1]);
  expect(m.attach).not.toHaveBeenCalled();
});
it("never infers a country from the node’s client", async () => {
  render(
    React.createElement(BrandPlatformCta, { ...props, countryCode: null }),
  );
  confirm();
  await waitFor(() => expect(m.push).toHaveBeenCalled());
  expect(m.create).toHaveBeenCalledWith(
    expect.objectContaining({ country: undefined }),
  );
});
