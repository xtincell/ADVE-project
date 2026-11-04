import { createHash } from "node:crypto";

/** Persiste un buffer image : blob storage si configuré, sinon data URL. */
export async function persistImage(buffer: Buffer): Promise<string> {
  const template = process.env.BLOB_STORAGE_PUT_URL_TEMPLATE;
  if (template) {
    try {
      const hash = createHash("sha256").update(buffer).digest("hex");
      const target = template.replace(/\{hash\}/g, hash);
      const put = await fetch(target, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: new Uint8Array(buffer),
      });
      if (put.ok) return target;
    } catch {
      /* fall through to data URL */
    }
  }
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
