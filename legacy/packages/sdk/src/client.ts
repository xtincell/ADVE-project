/**
 * LaFuseeClient — public REST-like SDK over the tRPC public surface.
 */

import type { ResolvedPrice } from "./types";

export interface LaFuseeClientOptions {
  baseUrl: string;
  /** Optional API token for authenticated endpoints. */
  apiToken?: string;
  /** Custom fetch (Node 18+ has it native). */
  fetchImpl?: typeof fetch;
}

export class LaFuseeClient {
  constructor(private readonly opts: LaFuseeClientOptions) {}

  private get fetch(): typeof fetch {
    return this.opts.fetchImpl ?? globalThis.fetch;
  }

  private url(path: string, query?: Record<string, unknown>): string {
    const u = new URL(`/api/trpc${path}`, this.opts.baseUrl);
    if (query) u.searchParams.set("input", JSON.stringify(query));
    return u.toString();
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.opts.apiToken) h.Authorization = `Bearer ${this.opts.apiToken}`;
    return h;
  }

  // ── Public endpoints (no auth) ────────────────────────────────────

  async getPrice(input: { tierKey: string; countryCode?: string }): Promise<ResolvedPrice> {
    const res = await this.fetch(this.url("/monetization.getPrice", input), {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`getPrice failed: ${res.statusText}`);
    const data = (await res.json()) as { result: { data: ResolvedPrice } };
    return data.result.data;
  }

  async getTierGrid(input: { countryCode?: string; tierKeys?: string[] }): Promise<Array<{ definition: { key: string; label: string }; price: ResolvedPrice }>> {
    const res = await this.fetch(this.url("/monetization.getTierGrid", input), {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`getTierGrid failed: ${res.statusText}`);
    const data = (await res.json()) as { result: { data: Array<{ definition: { key: string; label: string }; price: ResolvedPrice }> } };
    return data.result.data;
  }

  async getStatus(): Promise<{ healthy: boolean; lastIntent?: { kind: string; at: string } }> {
    const res = await this.fetch(new URL("/status", this.opts.baseUrl).toString());
    return { healthy: res.ok };
  }
}

export function createLaFuseeClient(opts: LaFuseeClientOptions): LaFuseeClient {
  return new LaFuseeClient(opts);
}
