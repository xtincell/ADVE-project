/**
 * Opt-in step profile for slow integration cases (RESIDUAL-DEBT, grand document).
 *
 * Without an output path every helper is a passthrough: no spy, no observer,
 * no extra allocation, so the profiled test keeps its exact behaviour.
 * With a path, wall-clock per step, process CPU and GC pauses are written as
 * JSON. Spies only wrap existing functions; arguments and results are untouched.
 */
import { PerformanceObserver, performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { getHeapStatistics } from "node:v8";
import { vi } from "vitest";

type Totals = { count: number; totalMs: number; maxMs: number };

export function createStepProfile(outPath: string | undefined) {
  const steps = new Map<string, Totals>(), spies: { mockRestore(): void }[] = [];
  let gcMs = 0, gcCount = 0, heapPeakMb = 0, sampler: NodeJS.Timeout | undefined, observer: PerformanceObserver | undefined;
  let cpu = process.cpuUsage(), startedAt = performance.now();
  const record = (name: string, ms: number) => {
    const s = steps.get(name) ?? { count: 0, totalMs: 0, maxMs: 0 };
    s.count++; s.totalMs += ms; s.maxMs = Math.max(s.maxMs, ms); steps.set(name, s);
  };
  async function time<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    if (!outPath) return fn();
    const t = performance.now();
    try { return await fn(); } finally { record(name, performance.now() - t); }
  }
  /** Passthrough spy on an existing module export, only when profiling. */
  function wrap(namespace: object, method: string, name: string) {
    if (!outPath) return;
    const target = namespace as Record<string, (...args: unknown[]) => unknown>;
    const original = target[method]!;
    spies.push(vi.spyOn(target, method).mockImplementation(function (this: unknown, ...args: unknown[]) {
      const t = performance.now(), result = original.apply(this, args);
      if (result instanceof Promise) return result.finally(() => record(name, performance.now() - t));
      record(name, performance.now() - t); return result;
    }));
  }
  function start() {
    if (!outPath) return;
    observer = new PerformanceObserver(list => { for (const e of list.getEntries()) { gcMs += e.duration; gcCount++; } });
    observer.observe({ entryTypes: ["gc"] });
    sampler = setInterval(() => { heapPeakMb = Math.max(heapPeakMb, process.memoryUsage().heapUsed / 1048576); }, 100);
    cpu = process.cpuUsage(); startedAt = performance.now();
  }
  function stop(extra: Record<string, unknown> = {}) {
    if (!outPath) return;
    observer?.disconnect(); if (sampler) clearInterval(sampler);
    for (const spy of spies.splice(0)) spy.mockRestore();
    const used = process.cpuUsage(cpu), round = (n: number) => Math.round(n * 10) / 10;
    writeFileSync(outPath, JSON.stringify({
      ...extra, wallMs: round(performance.now() - startedAt),
      cpuUserMs: round(used.user / 1000), cpuSystemMs: round(used.system / 1000),
      gcMs: round(gcMs), gcCount, heapPeakMb: round(heapPeakMb), heapLimitMb: round(getHeapStatistics().heap_size_limit / 1048576),
      steps: Object.fromEntries([...steps].map(([k, v]) => [k, { count: v.count, totalMs: round(v.totalMs), maxMs: round(v.maxMs) }])),
    }, null, 2));
  }
  return { enabled: Boolean(outPath), time, wrap, start, stop };
}

