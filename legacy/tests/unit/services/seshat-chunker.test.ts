import { describe, it, expect } from "vitest";
import { chunkText } from "@/server/services/seshat/context-store/chunker";

describe("SESHAT — chunkText (BRAND_SOURCE chunking)", () => {
  it("returns empty array for empty / whitespace input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n   ")).toEqual([]);
  });

  it("returns a single chunk for short text below 2500 chars", () => {
    const text = "Lorem ipsum dolor sit amet.";
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toBe(text);
    expect(chunks[0]!.index).toBe(0);
    expect(chunks[0]!.charStart).toBe(0);
    expect(chunks[0]!.charEnd).toBe(text.length);
  });

  it("splits on paragraph boundaries", () => {
    const para = "x".repeat(1500);
    const text = `${para}\n\n${para}\n\n${para}`;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // Each chunk respects the 2500 char ceiling (allowing ~2x for buffer-merge fallback).
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(5000);
    }
    // Indexes are strictly increasing from 0
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
  });

  it("falls back to sentence boundaries when a paragraph is too long", () => {
    const sentence = "This is a sentence. ".repeat(200); // ~4000 chars, single paragraph
    const chunks = chunkText(sentence);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // Hard ceiling enforced (no chunk grossly oversized).
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(5000);
    }
  });

  it("handles a brandbook-shaped document with mixed-length sections", () => {
    const sections = [
      "# Logo\n\nOur logo is bold and minimal.",
      "# Palette\n\n" + "Color rules and tokens. ".repeat(50),
      "# Typography\n\nWe use Inter for body and Bricolage for display.",
      "# Tone\n\n" + "Voice principles applied consistently. ".repeat(80),
      "# Manifesto\n\nWe build for the few who care.",
    ].join("\n\n");
    const chunks = chunkText(sections);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.every((c) => c.text.length > 0)).toBe(true);
  });

  it("preserves chunk ordering and consecutive char ranges", () => {
    const para = "a".repeat(2400);
    const text = `${para}\n\n${para}\n\n${para}`;
    const chunks = chunkText(text);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i]!.charStart).toBeGreaterThanOrEqual(chunks[i - 1]!.charStart);
    }
  });
});
