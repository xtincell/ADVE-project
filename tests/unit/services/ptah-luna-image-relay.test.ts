import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ rate: vi.fn(async (_model: string, fn: () => unknown) => fn()) }));
vi.mock("@/server/services/llm-gateway/rate-policy", () => ({ runWithRateLimit: calls.rate }));
import { openaiImagesProvider } from "@/server/services/ptah/providers/openai";
const brief = { briefText: "Synthetic visual", pillarSource: "D" as const, manipulationMode: "facilitator" as const, forgeSpec: { kind: "image" as const, parameters: { prompt: "Keep this exact approved prompt" } } };
beforeEach(() => { vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://relay.test/v1"); vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "local-only"); vi.stubEnv("OPENAI_API_KEY", "embedding-only"); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("image production reuses the subscription transport and rate manager", () => {
  it("requires the relay's image capability instead of assuming text access is image access", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ images: false }))));
    expect(await openaiImagesProvider.isAvailable()).toBe(false);
    await expect(openaiImagesProvider.forge(brief)).rejects.toThrow(/pas encore raccordée/);
  });
  it("uses the same Luna bucket, exact prompt and private image endpoint, with no API fallback", async () => {
    const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/health") ? { images: true } : { data: [{ b64_json: "aW1hZ2U=" }] })));
    vi.stubGlobal("fetch", fetcher);
    const result = await openaiImagesProvider.forge(brief);
    expect(calls.rate).toHaveBeenCalledWith("gpt-5.6-luna", expect.any(Function));
    const generation = fetcher.mock.calls.find(([url]) => url.endsWith("/images/generations")) as unknown as [string, RequestInit];
    expect(generation[0]).toBe("http://relay.test/v1/images/generations");
    expect(JSON.parse(String(generation[1].body))).toMatchObject({ prompt: "Keep this exact approved prompt", n: 1 });
    expect(result.providerTaskId).toMatch(/^openai-image:[a-f0-9]{64}$/);
    expect(result.synchronousResult).toEqual({ resultUrls: ["data:image/png;base64,aW1hZ2U="], realisedCostUsd: 0 });
    expect(fetcher.mock.calls.every(([url]) => !url.includes("api.openai.com"))).toBe(true);
  });
  it("refuses oversized image requests locally and never copies a provider echo into an error receipt", async () => {
    const pixels="data:image/webp;base64,"+Buffer.from("private input pixels").toString("base64");
    const fetcher=vi.fn(async (url:string)=>url.endsWith("/health") ? new Response('{"images":true}') : new Response(pixels,{status:422}));
    vi.stubGlobal("fetch",fetcher);
    const conditioned=(url:string)=>({...brief,forgeSpec:{...brief.forgeSpec,parameters:{
      ...brief.forgeSpec.parameters,productionReferences:[{assetId:"fixture",version:1,originalHash:"a".repeat(64)}],referenceImageUrls:[url]}}});
    const large="data:image/png;base64,"+Buffer.alloc(6*1024*1024+1).toString("base64");
    await expect(openaiImagesProvider.forge(conditioned(large))).rejects.toThrow(/8 Mio/);
    expect(fetcher.mock.calls.filter(([url])=>url.endsWith("/images/generations"))).toHaveLength(0);
    await expect(openaiImagesProvider.forge(conditioned(pixels))).rejects.toThrow(/^OpenAI Images 422: Le moteur a refusé la génération avec les références sélectionnées\.$/);
  });
  it("returns recognized relay failures while dropping arbitrary error text",async()=>{
    const ref="data:image/png;base64,"+Buffer.from("private fixture").toString("base64");
    const limited={...brief,forgeSpec:{...brief.forgeSpec,parameters:{...brief.forgeSpec.parameters,referenceImageUrls:[ref]}}};
    vi.stubGlobal("fetch",vi.fn(async(url:string)=>url.endsWith("/health")?Response.json({images:true}):Response.json({error:{code:"oauth_worker_failed",message:ref}},{status:502})));
    await expect(openaiImagesProvider.forge(limited)).rejects.toThrow(/^OpenAI Images 502: Le processus OAuth n’a pas terminé correctement\.$/);
  });
  it("fails visibly on transport rejection and never changes billing transport", async () => {
    const fetcher = vi.fn(async (url: string) => url.endsWith("/health") ? new Response('{"images":true}') : new Response('{"error":{"code":"local_busy"}}', { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(openaiImagesProvider.forge(brief)).rejects.toThrow(/429/);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
