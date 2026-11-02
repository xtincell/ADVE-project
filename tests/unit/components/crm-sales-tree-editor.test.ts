// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CrmSalesTreeEditor } from "@/components/console/crm-sales-tree-editor";
import { advanceSale, conversationTreeSchema, type SalesState, type SalesStep } from "@/server/services/crm-engine/commercial";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function readTree(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[name="tree"]')!;
  return input.value ? conversationTreeSchema.parse(JSON.parse(input.value)) : null;
}
describe("sales tree authoring", () => {
  it("keeps the standard path until the manager chooses to author a brand-specific tree", () => {
    const { container } = render(React.createElement(CrmSalesTreeEditor));
    expect(readTree(container)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Personnaliser le parcours de vente" }));
    expect(readTree(container)?.nodes).toHaveLength(8);
    expect(container.querySelector('textarea[name="tree"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Utiliser le parcours standard" }));
    expect(readTree(container)).toBeNull();
  });
  it("turns the manager's edited questions into an executable approval path while keeping partner and audience outside the sale", () => {
    const { container } = render(React.createElement(CrmSalesTreeEditor));
    fireEvent.click(screen.getByRole("button", { name: "Personnaliser le parcours de vente" }));
    fireEvent.change(screen.getByLabelText("Question ou action du vendeur"), { target: { value: "Quel public votre restaurant veut-il attirer ?" } });
    const tree = readTree(container)!;
    expect(tree.nodes[0]?.prompt).toBe("Quel public votre restaurant veut-il attirer ?");
    const actor = { id: "seller", admin: false };
    const now = new Date("2026-11-02T00:00:00Z");
    const initial: SalesState = { node: "DISCOVERY", treeNodeId: tree.start, mandate: {
      offerId: "gold", offerVersion: "1", offerName: "Gold", terms: "Une présence mensuelle, aucune réservation garantie.",
      amount: 60000, currency: "XOF", sellerId: actor.id, deliveryOwnerId: "delivery", beneficiary: "SPAWT",
      expiresAt: "2030-01-01T00:00:00.000Z", paymentInstructions: "Attendre la confirmation financière.", channels: ["EMAIL"], conversationTree: tree,
    } };
    const branch = (state: SalesState, choiceId: string) => advanceSale(state, {
      requestId: "00000000-0000-4000-8000-000000000001", expectedRevision: 0, channel: "EMAIL",
      command: { type: "BRANCH", choiceId, evidence: "Réponse observée pendant la recette." },
    } satisfies SalesStep, actor, now);
    expect(branch(initial, "partner").node).toBe("PARTNER");
    expect(branch(initial, "audience").node).toBe("AUDIENCE");
    const qualified = branch(initial, "buyer");
    expect(qualified.node).toBe("QUALIFIED");
    const proposed = branch(qualified, "presented");
    expect(proposed.node).toBe("PROPOSAL");
    expect(branch(proposed, "accepted").node).toBe("ACCEPTED");
    expect(branch(proposed, "stop").contactStopped).toBe(true);
  });
});
