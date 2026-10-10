// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ActionDatabasePanel } from "@/components/cockpit/action-database-panel";

const fixture = vi.hoisted(() => ({ select: vi.fn(), sync: vi.fn(), propose: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ pillar: { get: { invalidate: vi.fn() }, assess: { invalidate: vi.fn() }, readiness: { invalidate: vi.fn() } } }),
  actions: {
    summary: { useQuery: () => ({ data: { total: 1, selectedCount: 0, byTouchpoint: {} }, refetch: vi.fn() }) },
    byStrategy: { useQuery: () => ({ data: [{ id: "one", title: "Action existante", selected: false, status: "PROPOSED" }], refetch: vi.fn() }) },
    sync: { useMutation: () => ({ mutate: fixture.sync, isPending: false }) },
    setSelected: { useMutation: () => ({ mutate: fixture.select, isPending: false }) },
    propose: { useMutation: () => ({ mutate: fixture.propose, isPending: false }) },
  },
} }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("React", React); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("action catalogue — visible calendar permission", () => {
  it("keeps reads available and makes no write gesture without received permissions", () => {
    render(React.createElement(ActionDatabasePanel, { strategyId: "fixture" }));
    expect(screen.getByText("Action existante")).toBeTruthy();
    const choice = screen.getByTitle("Lecture seule sur ces actions");
    fireEvent.click(choice);
    expect((choice as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Proposer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Synchroniser" })).toBeNull();
    expect(fixture.select).not.toHaveBeenCalled();
  });

  it("allows the owner's choice separately from the operator refresh", () => {
    render(React.createElement(ActionDatabasePanel, { strategyId: "fixture", canWrite: true }));
    fireEvent.click(screen.getByTitle("Retenir pour la roadmap"));
    expect(fixture.select).toHaveBeenCalledWith({ strategyId: "fixture", actionId: "one", selected: true });
    expect(screen.queryByRole("button", { name: "Synchroniser" })).toBeNull();
  });

  it("opens a manual proposal first; assisted generation stays an explicit option", () => {
    render(React.createElement(ActionDatabasePanel, { strategyId: "fixture", canWrite: true }));
    fireEvent.click(screen.getByRole("button", { name: "Proposer" }));
    expect(screen.getByPlaceholderText("Titre de l'action")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Générer 5 actions" })).toBeNull();
    expect(fixture.propose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Générer (IA)" }));
    expect(screen.getByRole("button", { name: "Générer 5 actions" })).toBeTruthy();
    expect(fixture.propose).not.toHaveBeenCalled();
  });

  it("also requires the brand calendar permission when refresh capability is passed", () => {
    render(React.createElement(ActionDatabasePanel, { strategyId: "fixture", canSync: true, canWrite: false }));
    expect(screen.queryByRole("button", { name: "Synchroniser" })).toBeNull();
    expect(fixture.sync).not.toHaveBeenCalled();
  });
});
