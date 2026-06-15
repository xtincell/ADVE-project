import { describe, it, expect } from "vitest";
import { INTENT_KINDS, intentKindExists } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import {
  postGuildMissionInputSchema,
  guildMissionBriefSchema,
  guildMissionDraftSchema,
  extractBriefData,
  toPublicGuildMission,
  slugifyMissionTitle,
  GUILD_MISSION_CATEGORIES,
  type PostGuildMissionInput,
} from "@/lib/types/guild-mission-brief";

const GUILD_KINDS = [
  "GUILD_POST_MISSION",
  "GUILD_PUBLISH_MISSION",
  "GUILD_REGISTER_TALENT",
  "GUILD_REGISTER_ORGANIZATION",
  "GUILD_DRAFT_MISSION_FROM_TEXT",
] as const;

describe("La Guilde — portail public (ADR-0098)", () => {
  it("registers the 4 GUILD_* intent kinds under governor IMHOTEP", () => {
    for (const k of GUILD_KINDS) {
      expect(intentKindExists(k)).toBe(true);
      const meta = INTENT_KINDS.find((x) => x.kind === k);
      expect(meta?.governor).toBe("IMHOTEP");
      expect(meta?.handler).toBe("laguilde");
    }
  });

  it("each GUILD_* kind has a paired SLO", () => {
    const sloNames = new Set(INTENT_SLOS.map((s) => s.kind));
    for (const k of GUILD_KINDS) {
      expect(sloNames.has(k), `missing SLO for ${k}`).toBe(true);
    }
  });

  const validInput: PostGuildMissionInput = {
    title: "Pack social 1 mois + key visual",
    category: "CONTENT",
    sector: "FMCG",
    location: "Douala",
    mode: "DISPATCH",
    budgetAmount: 500000,
    budgetCurrency: "XAF",
    brandName: "Matanga",
    summary: "Un mois de contenu social pour relancer la notoriété de la marque.",
    context: "La marque lance une nouvelle gamme et veut occuper le terrain social.",
    targetAudience: "Jeunes urbains 18-30 ans, Douala & Yaoundé",
    deliverables: [{ title: "12 posts Instagram" }, { title: "1 key visual" }],
    channels: ["INSTAGRAM"],
    skillsRequired: ["Community management"],
    remoteOk: true,
    qualityCriteria: [],
    references: [],
  };

  it("validates a complete brief input", () => {
    const parsed = postGuildMissionInputSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("rejects an incomplete brief (summary too short, no deliverable)", () => {
    expect(postGuildMissionInputSchema.safeParse({ ...validInput, summary: "trop court" }).success).toBe(false);
    expect(postGuildMissionInputSchema.safeParse({ ...validInput, deliverables: [] }).success).toBe(false);
  });

  it("brief data carries the GUILD_MISSION_BRIEF marker", () => {
    const brief = extractBriefData(validInput);
    const reparsed = guildMissionBriefSchema.safeParse(brief);
    expect(reparsed.success).toBe(true);
    expect(brief._kind).toBe("GUILD_MISSION_BRIEF");
  });

  it("public projection NEVER leaks contact details", () => {
    const brief = extractBriefData({
      ...validInput,
      contactName: "Secret Person",
      contactEmail: "secret@brand.com",
    });
    const projected = toPublicGuildMission({
      id: "m1",
      publicSlug: "pack-social-abc123",
      title: validInput.title,
      category: validInput.category,
      sector: validInput.sector,
      location: validInput.location,
      mode: validInput.mode,
      budget: 500000,
      slaDeadline: null,
      guildPublishedAt: new Date(),
      briefData: { ...brief, budgetCurrency: "XAF" },
    });
    const asRecord = projected as unknown as Record<string, unknown>;
    expect(asRecord.contactName).toBeUndefined();
    expect(asRecord.contactEmail).toBeUndefined();
    expect(projected.brandName).toBe("Matanga");
    expect(projected.budgetCurrency).toBe("XAF");
    // Sanity: contact strings absent from the serialized projection.
    expect(JSON.stringify(projected)).not.toContain("secret@brand.com");
  });

  it("slug is URL-safe and collision-suffixed", () => {
    const slug = slugifyMissionTitle("Pack Réseaux Sociaux & Key Visual !", "abc123");
    expect(slug).toMatch(/^[a-z0-9-]+-abc123$/);
    expect(slug).not.toContain("é");
  });

  it("LLM assist draft schema is forgiving (manual-first parity, ADR-0060)", () => {
    // Sparse inference must validate — the CEO corrects the rest.
    expect(guildMissionDraftSchema.safeParse({}).success).toBe(true);
    expect(guildMissionDraftSchema.safeParse({ summary: "Un mois de contenu social." }).success).toBe(true);
    expect(
      guildMissionDraftSchema.safeParse({ title: "Pack social", deliverables: [{ title: "12 posts" }] }).success,
    ).toBe(true);
    // The deterministic submit path stays INDEPENDENT: a sparse draft is NOT a
    // valid submission by itself — the strict form still gates the real mutation.
    expect(postGuildMissionInputSchema.safeParse({ summary: "x" }).success).toBe(false);
  });

  it("exposes the canonical category set", () => {
    expect(GUILD_MISSION_CATEGORIES).toContain("BRANDING");
    expect(GUILD_MISSION_CATEGORIES).toContain("AUTRE");
  });
});
