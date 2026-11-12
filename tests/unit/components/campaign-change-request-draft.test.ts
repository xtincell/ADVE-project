// @vitest-environment jsdom
/**
 * Brouillon de reprise après remontage : le besoin saisi et l'identité de la demande
 * survivent à une navigation ou un rechargement de l'onglet, afin qu'un renvoi après
 * remontage retrouve le même reçu au lieu de créer une seconde reprise.
 */
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

type Options = { onSuccess?: (res: unknown) => void; onError?: (err: Error) => void; onSettled?: () => void };
const calls = vi.hoisted(() => ({ create: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ campaignChangeRequest: { invalidate: calls.invalidate } }),
  campaignChangeRequest: { create: { useMutation: (options: Options) => ({
    isPending: false,
    mutate: (input: unknown) => {
      Promise.resolve(calls.create(input)).then(
        res => { options.onSuccess?.(res); options.onSettled?.(); },
        (err: Error) => { options.onError?.(err); options.onSettled?.(); },
      );
    },
  }) } },
} }));
import { CampaignChangeRequestForm } from "@/components/portfolio/CampaignChangeRequestForm";

const props = { campaignDeliverableId: "task-a", strategyId: "brand", operatorId: "team" };
const never = () => new Promise(() => undefined);
function mount(extra: Partial<React.ComponentProps<typeof CampaignChangeRequestForm>> = {}) {
  return render(React.createElement(CampaignChangeRequestForm, { ...props, ...extra }));
}
function fill(name: string, need: string) {
  fireEvent.change(screen.getByLabelText("Demandeur"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Description de la modif demandée"), { target: { value: need } });
}
const nameInput = () => screen.getByLabelText("Demandeur") as HTMLInputElement;
const needInput = () => screen.getByLabelText("Description de la modif demandée") as HTMLTextAreaElement;
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Enregistrer la demande" }));

beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("change request draft after remount", () => {
  it("replays the same request identity after the form is unmounted during an unconfirmed submission", async () => {
    calls.create.mockImplementation(never);
    const first = mount();
    fill("Responsable client", "Remplacer le visuel principal.");
    fireEvent.click(screen.getByRole("radio", { name: /Majeur/ }));
    submit();
    await waitFor(() => expect(calls.create).toHaveBeenCalledOnce());
    const sent = calls.create.mock.calls[0]![0] as { requestId: string; impact: string };
    expect(sent.requestId).toMatch(/^[0-9a-f-]{36}$/);
    first.unmount();

    calls.create.mockResolvedValueOnce({ ok: true, ticket: { id: sent.requestId } });
    const onSuccess = vi.fn();
    mount({ onSuccess });
    await waitFor(() => expect(nameInput().value).toBe("Responsable client"));
    expect(needInput().value).toBe("Remplacer le visuel principal.");
    expect((screen.getByRole("radio", { name: /Majeur/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("status").textContent).toMatch(/même demande/);
    submit();
    await waitFor(() => expect(calls.create).toHaveBeenCalledTimes(2));
    expect(calls.create.mock.calls[1]![0]).toEqual(calls.create.mock.calls[0]![0]);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(sent.requestId));
    expect(sessionStorage.length).toBe(0);
  });

  it("restores a need typed before navigation and identifies it only when it is sent", async () => {
    const first = mount();
    fill("Demandeur conservé", "Besoin saisi avant de quitter la page.");
    first.unmount();
    calls.create.mockResolvedValue({ ok: true, ticket: { id: "receipt" } });
    mount();
    await waitFor(() => expect(needInput().value).toBe("Besoin saisi avant de quitter la page."));
    submit();
    await waitFor(() => expect(calls.create).toHaveBeenCalledOnce());
    expect(calls.create.mock.calls[0]![0]).toMatchObject({ requestedByName: "Demandeur conservé", campaignDeliverableId: "task-a" });
  });

  it("purges the draft once the receipt is confirmed, so the next form starts empty", async () => {
    calls.create.mockResolvedValue({ ok: true, ticket: { id: "receipt" } });
    const first = mount();
    fill("Demandeur", "Besoin reçu.");
    submit();
    await waitFor(() => expect(sessionStorage.length).toBe(0));
    first.unmount();
    mount();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(nameInput().value).toBe("");
    expect(needInput().value).toBe("");
  });

  it("gives a changed need a new identity instead of reusing the stored one", async () => {
    calls.create.mockImplementation(never);
    const first = mount();
    fill("Demandeur", "Premier besoin.");
    submit();
    await waitFor(() => expect(calls.create).toHaveBeenCalledOnce());
    first.unmount();
    mount();
    await waitFor(() => expect(needInput().value).toBe("Premier besoin."));
    fireEvent.change(needInput(), { target: { value: "Besoin modifié." } });
    submit();
    await waitFor(() => expect(calls.create).toHaveBeenCalledTimes(2));
    const [a, b] = calls.create.mock.calls.map(call => (call[0] as { requestId: string }).requestId);
    expect(b).not.toBe(a);
  });

  it("keeps drafts separate per task", async () => {
    const first = mount();
    fill("Demandeur", "Besoin de la tâche A.");
    first.unmount();
    mount({ campaignDeliverableId: "task-b" });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(needInput().value).toBe("");
  });

  it("ignores and removes a malformed stored draft", async () => {
    const first = mount();
    fill("Demandeur", "Besoin.");
    first.unmount();
    const key = sessionStorage.key(0)!;
    for (const corrupted of ["{", JSON.stringify({ v: 1, requestedByName: "x", description: "y", impact: "INVENTÉ" }),
      JSON.stringify({ v: 1, requestedByName: "x", description: "y".repeat(5001), impact: "MINOR" }),
      JSON.stringify({ v: 1, requestedByName: "x", description: "y", impact: "MINOR", attempt: { body: "{}", requestId: "pas-un-uuid" } })]) {
      sessionStorage.setItem(key, corrupted);
      const view = mount();
      await waitFor(() => expect(sessionStorage.getItem(key)).toBeNull());
      expect(needInput().value).toBe("");
      view.unmount();
    }
  });

  it("abandons the draft on explicit cancellation", async () => {
    const onCancel = vi.fn();
    mount({ onCancel });
    fill("Demandeur", "Besoin abandonné.");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(sessionStorage.length).toBe(0);
  });

  it("still works when the browser refuses storage", async () => {
    const blocked = () => { throw new Error("blocked"); };
    const failing = { getItem: vi.fn(blocked), setItem: vi.fn(blocked), removeItem: vi.fn(blocked),
      key: () => null, clear: () => undefined, length: 0 };
    vi.stubGlobal("sessionStorage", failing);
    calls.create.mockResolvedValue({ ok: true, ticket: { id: "receipt" } });
    const onSuccess = vi.fn();
    mount({ onSuccess });
    fill("Demandeur", "Besoin sans stockage.");
    submit();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("receipt"));
    expect(failing.getItem).toHaveBeenCalled();
    expect(failing.setItem).toHaveBeenCalled();
  });
});
