import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { getCloneableBody } from "next/dist/server/body-streams";
import config from "../../../next.config";
import { MAX_SOURCE_BYTES } from "@/domain/source-original";

const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const envelope = () => Buffer.from(JSON.stringify({ "0": { json: {
  strategyId: "synthetic-brand", name: "é".repeat(500), type: "IMAGE",
  file: { name: "é".repeat(500), mimeType: "application/octet-stream",
    content: Buffer.alloc(MAX_SOURCE_BYTES, 65).toString("base64") },
  provenance: { provider: "GOOGLE_DRIVE", externalId: "x".repeat(200),
    path: "é".repeat(2000), modifiedAt: "2026-10-20T00:00:00.000Z" }, autoTag: false,
} } }));
function body(bytes: Buffer, limit?: number) {
  const chunks = function* () { for (let offset = 0; offset < bytes.length; offset += 65536) yield bytes.subarray(offset, offset + 65536); };
  return getCloneableBody(Readable.from(chunks()) as IncomingMessage, limit);
}
async function read(stream: Readable) {
  const chunks: Buffer[] = []; for await (const chunk of stream) chunks.push(chunk); return Buffer.concat(chunks);
}

describe("permitted original survives Next's actual proxy body clone", () => {
  it("reproduces the default truncation even though the file itself is allowed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const bytes = envelope(), cloned = await read(body(bytes).cloneBodyStream());
      expect(cloned.length).toBeLessThan(bytes.length);
      expect(() => JSON.parse(cloned.toString())).toThrow();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Request body exceeded 10MB"));
    } finally { warn.mockRestore(); }
  });
  it("passes the complete maximum file envelope through both proxy and handler reads", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const bytes = envelope(), configured = config.experimental?.proxyClientMaxBodySize;
      const stream = body(bytes, typeof configured === "number" ? configured : undefined);
      const proxy = await read(stream.cloneBodyStream()), handler = await read(stream.cloneBodyStream());
      expect(proxy.length).toBe(bytes.length); expect(handler.length).toBe(bytes.length);
      expect(digest(proxy)).toBe(digest(bytes)); expect(digest(handler)).toBe(digest(bytes));
      expect(JSON.parse(handler.toString())["0"].json.file.content.length).toBe(Math.ceil(MAX_SOURCE_BYTES / 3) * 4);
      expect(warn).not.toHaveBeenCalled();
    } finally { warn.mockRestore(); }
  });
});
