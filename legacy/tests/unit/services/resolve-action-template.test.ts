/**
 * ADR-0094 — cost-template resolver (I action → ActionCostTemplate.actionKey).
 *
 * Pure, deterministic, zero-DB. Locks: (a) every key the resolver can emit exists
 * in the ADR-0093 catalog, (b) representative SPAWT descriptors map sanely,
 * (c) undeterminable descriptors return null (no fabricated estimate).
 */

import { describe, it, expect } from "vitest";
import { CATALOG_BY_KEY } from "@/server/services/financial-brain/action-costing/catalog";
import {
  resolveActionTemplateKey,
  type ActionTemplateKey,
} from "@/server/services/financial-brain/action-costing/resolve-template";

const ALL_KEYS: ActionTemplateKey[] = [
  "PHOTO_SESSION_HALF_DAY",
  "VIDEO_SHOOT_1DAY",
  "SOCIAL_CONTENT_BATCH",
  "RADIO_SPOT_30S",
  "TV_SPOT_30S",
  "EVENT_ACTIVATION_DAY",
  "OOH_CAMPAIGN_PANEL",
  "INFLUENCER_POST",
  "PRINT_KV",
  "PR_PRESS_EVENT",
  "PACKAGING_DESIGN",
  "LANDING_PAGE",
];

describe("resolveActionTemplateKey — parity with catalog", () => {
  it("every resolvable key exists in the ADR-0093 cost catalog", () => {
    for (const key of ALL_KEYS) {
      expect(CATALOG_BY_KEY[key], `catalog missing ${key}`).toBeDefined();
    }
  });
});

describe("resolveActionTemplateKey — SPAWT descriptors", () => {
  const cases: Array<[string, ActionTemplateKey]> = [
    ["TikTok organiques food porn SPAWT", "SOCIAL_CONTENT_BATCH"],
    ["Instagram @spawt_ci — 1 post + 5-8 stories/jour", "SOCIAL_CONTENT_BATCH"],
    ["Food Tours mensuels guidés", "EVENT_ACTIVATION_DAY"],
    ["Pop-up 'Palais des Saveurs' (centres commerciaux)", "EVENT_ACTIVATION_DAY"],
    ["Programme Ambassadeurs Allié Content (10-15 Vanessa-tier)", "INFLUENCER_POST"],
    ["Relations presse food/tech Afrique", "PR_PRESS_EVENT"],
    ["Mini-jeu web 'Quel Spawter es-tu ?' viral", "LANDING_PAGE"],
    ["Stickers WhatsApp SPAWT mascotte chat", "PACKAGING_DESIGN"],
    ["Site web vitrine + blog food culture Abidjan", "LANDING_PAGE"],
    ["Newsletter SPAWT Weekly (top spots + archetypes)", "SOCIAL_CONTENT_BATCH"],
  ];

  it.each(cases)("%s → %s", (title, expected) => {
    expect(resolveActionTemplateKey({ title })).toBe(expected);
  });

  it("returns null for an undeterminable / empty descriptor", () => {
    expect(resolveActionTemplateKey({})).toBeNull();
    expect(resolveActionTemplateKey({ title: "   " })).toBeNull();
    expect(resolveActionTemplateKey({ title: "xyzzy quux blob" })).toBeNull();
  });

  it("is accent-insensitive", () => {
    expect(resolveActionTemplateKey({ title: "Évènement activation terrain" })).toBe("EVENT_ACTIVATION_DAY");
  });
});
