import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), canAccess: vi.fn(), edition: vi.fn(), media: vi.fn(),
  privateExport: vi.fn(), csv: vi.fn(),
}));
vi.mock("@/lib/auth/config", () => ({ auth: mocks.auth }));
vi.mock("@/server/services/operator-isolation", () => ({ canAccessStrategy: mocks.canAccess }));
vi.mock("@/server/services/data-export", () => ({
  exportPublicBrand: mocks.edition, exportStrategyData: mocks.privateExport, exportAsCsv: mocks.csv,
}));
vi.mock("@/server/services/brand-vault/public-media", () => ({ readPublicLogo: mocks.media }));
import { GET as exportGet } from "@/app/api/export/[strategyId]/route";
import { GET as mediaGet } from "@/app/brand/editions/[editionId]/[file]/route";

const owned = ["https://spawt.online", "https://www.spawt.online", "https://portail.spawt.online", "https://quiz.spawt.online"];
const hash = "ab".repeat(32), edition = "edition-fixture";
const exported = { edition, digest: hash };
const media = { bytes: Buffer.from("fixture"), receipt: { contentHash: hash, mediaType: "font/ttf" } };
function request(url: string, origin?: string, etag?: string) {
  return new Request(url, { headers: { ...(origin === undefined ? {} : { Origin: origin }), ...(etag ? { "If-None-Match": etag } : {}) } });
}
function calls(origin?: string, etag?: string) {
  return [
    exportGet(request("https://example.invalid/api/export/LFA-spawt?format=public-brand-v2", origin, etag), { params: Promise.resolve({ strategyId: "LFA-spawt" }) }),
    mediaGet(request(`https://example.invalid/brand/editions/${edition}/${hash}.ttf`, origin, etag), { params: Promise.resolve({ editionId: edition, file: hash + ".ttf" }) }),
  ];
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.edition.mockResolvedValue(exported); mocks.media.mockResolvedValue(media);
  mocks.auth.mockResolvedValue(null); mocks.canAccess.mockResolvedValue(false);
});
describe("Chosen public edition and retained files share the owned origin boundary", () => {
  it.each(owned)("permits %s on both existing public transports without credentials", async origin => {
    for (const response of await Promise.all(calls(origin))) {
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
      expect(response.headers.get("access-control-allow-credentials")).toBeNull();
      expect(response.headers.get("vary")).toBe("Origin");
    }
  });
  it.each([undefined, "null", "http://quiz.spawt.online", "https://quiz.spawt.online:8443", "https://quiz.spawt.online.evil.invalid", "https://foreign.invalid"])("does not grant a foreign, absent or opaque origin: %s", async origin => {
    for (const response of await Promise.all(calls(origin))) {
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect(response.headers.get("access-control-allow-credentials")).toBeNull();
      expect(response.headers.get("vary")).toBe("Origin");
    }
  });
  it("keeps the quiz origin on conditional reads and empty public responses", async () => {
    const origin = owned[3]!;
    const responses = [
      await exportGet(request("https://example.invalid/api/export/LFA-spawt?format=public-brand-v2", origin, `"${edition}-${hash}"`), { params: Promise.resolve({ strategyId: "LFA-spawt" }) }),
      await mediaGet(request(`https://example.invalid/brand/editions/${edition}/${hash}.ttf`, origin, `"${hash}"`), { params: Promise.resolve({ editionId: edition, file: hash + ".ttf" }) }),
    ];
    mocks.edition.mockResolvedValue(null); mocks.media.mockResolvedValue(null);
    responses.push(...await Promise.all(calls(origin)));
    expect(responses.map(r => r.status)).toEqual([304, 304, 404, 404]);
    for (const response of responses) expect(response.headers.get("access-control-allow-origin")).toBe(origin);
  });
  it("does not turn an owned origin into authentication or access to private exports", async () => {
    const req = request("https://example.invalid/api/export/private-brand?format=json", owned[3]);
    const params = { params: Promise.resolve({ strategyId: "private-brand" }) };
    const anonymous = await exportGet(req, params);
    expect(anonymous.status).toBe(401); expect(anonymous.headers.get("access-control-allow-origin")).toBeNull();
    mocks.auth.mockResolvedValue({ user: { id: "foreign-fixture", role: "USER", operatorId: "other-fixture" } });
    const foreign = await exportGet(req, params);
    expect(foreign.status).toBe(403); expect(foreign.headers.get("access-control-allow-origin")).toBeNull();
    expect(mocks.privateExport).not.toHaveBeenCalled(); expect(mocks.csv).not.toHaveBeenCalled();
  });
  it("retains the media query guard before reading any bytes", async () => {
    const response = await mediaGet(request(`https://example.invalid/brand/editions/${edition}/${hash}.ttf?private=1`, owned[3]), { params: Promise.resolve({ editionId: edition, file: hash + ".ttf" }) });
    expect(response.status).toBe(404); expect(mocks.media).not.toHaveBeenCalled();
  });
});
