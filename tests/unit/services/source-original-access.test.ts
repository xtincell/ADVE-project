import { beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ auth: vi.fn(), source: vi.fn(), scope: vi.fn(), access: vi.fn(), original: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: h.auth }));
vi.mock("@/lib/db", () => ({ db: { brandDataSource: { findUnique: h.source } } }));
vi.mock("@/server/services/operator-isolation", () => ({ canAccessStrategy: h.access, getOperatorContext: h.scope }));
vi.mock("@/server/services/ingestion-pipeline/original", () => ({ readSourceOriginal: h.original }));
import { GET } from "@/app/api/brand-sources/[sourceId]/original/route";
const request = () => GET(new Request("http://localhost/api/brand-sources/source-a/original"), { params: Promise.resolve({ sourceId: "source-a" }) });
beforeEach(() => {
  vi.resetAllMocks();
  h.auth.mockResolvedValue({ user: { id: "owner" } });
  h.source.mockResolvedValue({ strategyId: "brand-a" });
  h.scope.mockResolvedValue({ userId: "owner", role: "USER", operatorId: null });
  h.access.mockResolvedValue(true);
  h.original.mockResolvedValue({ bytes: Buffer.from("original bytes"), fileName: "brief\"\r\n<script>.txt", receipt: { contentHash: "hash" } });
});
describe("original download authorization", () => {
  it("requires a session before reading source metadata", async () => {
    h.auth.mockResolvedValue(null); expect((await request()).status).toBe(401);
    expect(h.source).not.toHaveBeenCalled(); expect(h.original).not.toHaveBeenCalled();
  });
  it("refuses another tenant without revealing file existence", async () => {
    h.access.mockResolvedValue(false); expect((await request()).status).toBe(404);
    expect(h.access).toHaveBeenCalledWith("brand-a", { userId: "owner", role: "USER", operatorId: null });
    expect(h.original).not.toHaveBeenCalled();
  });
  it("downloads exact bytes without public caching or executable content", async () => {
    const response = await request();
    expect(response.status).toBe(200); expect(await response.text()).toBe("original bytes");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(response.headers.get("content-disposition")).not.toMatch(/[\r\n]/);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it("never sends bytes after failed integrity verification", async () => {
    h.original.mockRejectedValue(new Error("corrupt"));
    const response = await request(); expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("original bytes");
  });
});
