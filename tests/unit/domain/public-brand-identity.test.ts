import { describe, expect, it } from "vitest";
import { PublicBrandPublicationInput } from "@/domain/public-brand";

const asset = { assetId: "chosen-asset", version: 1 };
const identity = {
  referenceSourceId: "reference",
  palette: { ...asset, roles: { ink: "#0A0A0A", signature: "#C8A44E", community: "#2D6B4F", paper: "#FAFAF8", warm: "#E89A39", soft: "#EFE8DC" } },
  typography: { ...asset, display: { family: "Klinsman", faces: [{ ...asset, weight: 400 }] }, body: { family: "Gotham", faces: [{ ...asset, weight: 400 }] } },
  mascots: { ...asset, uses: [{ ...asset, role: "greeting", alt: "Moka salue" }] },
  voice: { quote: "Ton chat a flairé un spot que tu n'as jamais testé.", attribution: "Moka" },
};
const input = { expectedRevision: "a".repeat(64), expectedPublishedId: null,
  content: { name: "SPAWT", title: "La carte du bon goût", tagline: "", description: "", logoUrl: null, links: [] }, identity };

describe("Explicit public identity choices", () => {
  it("allows the four identity families in the existing reviewed publication", () => {
    expect(PublicBrandPublicationInput.safeParse(input).success).toBe(true);
  });
  it("does not admit private charters or executable styles through an identity choice", () => {
    for (const patch of [{ privateSources: [] }, { css: "@import url(https://example.invalid)" }, { referenceSourceId: "" }]) {
      expect(PublicBrandPublicationInput.safeParse({ ...input, identity: { ...identity, ...patch } }).success).toBe(false);
    }
  });
  it("refuses ambiguous roles and invalid colors before a publication can be emitted", () => {
    expect(PublicBrandPublicationInput.safeParse({ ...input, identity: { ...identity,
      palette: { ...identity.palette, roles: { ...identity.palette.roles, ink: "url(secret)" } } } }).success).toBe(false);
    expect(PublicBrandPublicationInput.safeParse({ ...input, identity: { ...identity,
      mascots: { ...identity.mascots, uses: [identity.mascots.uses[0], identity.mascots.uses[0]] } } }).success).toBe(false);
  });
});
