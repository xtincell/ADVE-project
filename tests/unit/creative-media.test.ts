import { describe, expect, it } from "vitest";
import { sampledFrameTimes, readMediaBytes, annotationFitsCoverage } from "@/server/services/seshat/creative-intelligence/media-observations";
import { validateGatewayImages, visionConfiguration } from "@/server/services/llm-gateway/vision";

describe("media observation boundaries", () => {
  it("samples early visual evidence and the later video instead of reading only a thumbnail", () => {
    expect(sampledFrameTimes(20)).toEqual([0, 1, 2, 5, 10, 15, 19]);
    expect(sampledFrameTimes(0.1).every(t => t >= 0 && t < 0.1)).toBe(true);
    expect(() => sampledFrameTimes(301)).toThrow();
  });
  it("rejects model timestamps and durations absent from sampled evidence", () => {
    const coverage = { method: "SAMPLED_FRAMES", durationSeconds: 20, frameTimes: [0, 1, 2, 5, 10, 15, 19] };
    expect(annotationFitsCoverage({ durationSeconds: 20, evidence: [{ startSeconds: 1, endSeconds: 5 }] }, coverage)).toBe(true);
    expect(annotationFitsCoverage({ durationSeconds: 20, evidence: [{ startSeconds: 3 }] }, coverage)).toBe(false);
    expect(annotationFitsCoverage({ durationSeconds: 30, evidence: [] }, coverage)).toBe(false);
    expect(annotationFitsCoverage({ evidence: [{ startSeconds: 0 }] }, { method: "SUPPLIED_TEXT" })).toBe(false);
    expect(annotationFitsCoverage({ evidence: [{}] }, { method: "SINGLE_IMAGE" })).toBe(true);
  });
  it("bounds streamed bytes even without Content-Length", async () => {
    await expect(readMediaBytes(new Response("123456"), 5)).rejects.toThrow("volumineux");
  });
  it("rejects mislabeled or excessive images before any provider call", () => {
    expect(() => validateGatewayImages([{ mediaType: "image/jpeg", bytes: new Uint8Array([137, 80, 78, 71]) }])).toThrow();
    expect(() => validateGatewayImages(Array.from({ length: 9 }, () => ({ mediaType: "image/jpeg" as const, bytes: new Uint8Array([255, 216, 255, 0]) })))).toThrow();
    expect(() => validateGatewayImages([{ mediaType: "image/jpeg", bytes: new Uint8Array(1000001) }])).toThrow();
  });
  it("does not assume text provider configuration enables a vision route", () => {
    const oldProvider = process.env.LLM_VISION_PROVIDER, oldModel = process.env.LLM_VISION_MODEL;
    try {
      delete process.env.LLM_VISION_PROVIDER; delete process.env.LLM_VISION_MODEL; expect(visionConfiguration()).toBeNull();
      process.env.LLM_VISION_PROVIDER = "unsupported"; process.env.LLM_VISION_MODEL = "fixture-model"; expect(visionConfiguration()).toBeNull();
      process.env.LLM_VISION_PROVIDER = "ollama"; expect(visionConfiguration()).toEqual({ provider: "ollama", model: "fixture-model" });
    } finally { if (oldProvider == null) delete process.env.LLM_VISION_PROVIDER; else process.env.LLM_VISION_PROVIDER = oldProvider; if (oldModel == null) delete process.env.LLM_VISION_MODEL; else process.env.LLM_VISION_MODEL = oldModel; }
  });
});
