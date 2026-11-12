import type { ConnectorDegradationReason } from "@/domain/connector-result";
export class SourceReadError extends Error {
  constructor(public readonly reason: ConnectorDegradationReason) { super(reason); }
}
export async function readBoundedJson(response: Response, maxBytes = 2_000_000): Promise<unknown> {
  if (!response.ok) {
    await response.body?.cancel();
    throw new SourceReadError(response.status === 429 ? "RATE_LIMITED" : [401, 403].includes(response.status) ? "AUTH_REVOKED" : "VENDOR_OUTAGE");
  }
  if (!response.body || Number(response.headers.get("content-length") ?? 0) > maxBytes) { await response.body?.cancel(); throw new SourceReadError("VENDOR_OUTAGE"); }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > maxBytes) throw new SourceReadError("VENDOR_OUTAGE"); chunks.push(value); }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { await reader.cancel().catch(() => {}); }
}
