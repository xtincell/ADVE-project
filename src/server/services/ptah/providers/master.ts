import { createHash } from "node:crypto";
import type { ForgeProvider } from "../types";
import { persistImage } from "./image-storage";

/** A locked master can be rendered without a model, a credential or a provider charge. */
export const masterArtworkProvider: ForgeProvider = {
  name: "master",
  externalDomains: [],
  sync: true,
  estimateCost: () => 0,
  isAvailable: async () => true,
  async forge(_brief, _webhook, artwork) {
    if (!artwork || artwork.slot.photoPolicy !== "LOCKED_MASTER") {
      throw new Error("Le montage local exige un master verrouillé.");
    }
    const { composeArtworkMaster } = await import("../artwork-master");
    const png = await composeArtworkMaster(artwork.original, artwork.slot), url = await persistImage(png);
    return {
      providerTaskId: "master-png:" + createHash("sha256").update(png).digest("hex"),
      providerModel: "master-svg",
      estimatedCostUsd: 0,
      webhookSecret: "",
      synchronousResult: { resultUrls: [url], realisedCostUsd: 0 },
    };
  },
  async reconcile() {
    throw new Error("Le montage local doit être relu depuis son reçu conservé.");
  },
  verifyWebhook: () => false,
};
