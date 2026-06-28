/**
 * rate-policy.test.ts — Police de débit LLM par modèle.
 *
 * Verrouille : résolution de politique (exact / sous-chaîne / défaut),
 * application réelle de la concurrence max (sérialisation), et bornage RPM.
 * « Le système n'improvise pas » : limites déclarées, respectées.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  resolveRatePolicy,
  acquireSlot,
  releaseSlot,
  runWithRateLimit,
  _setRatePolicyForTest,
  _resetRateLimiterForTest,
  _getBucketForTest,
} from "@/server/services/llm-gateway/rate-policy";

afterEach(() => _resetRateLimiterForTest());

describe("rate-policy — résolution par modèle", () => {
  it("résout exact, puis sous-chaîne, puis défaut", () => {
    _setRatePolicyForTest(
      { "owl-alpha": { rpm: 20, maxConcurrent: 2, minIntervalMs: 0 } },
      { rpm: 60, maxConcurrent: 4, minIntervalMs: 0 },
    );
    expect(resolveRatePolicy("owl-alpha").policy.rpm).toBe(20);
    // sous-chaîne : un slug provider-préfixé partage le bucket owl-alpha
    const sub = resolveRatePolicy("openrouter/owl-alpha");
    expect(sub.key).toBe("owl-alpha");
    expect(sub.policy.maxConcurrent).toBe(2);
    // inconnu → défaut
    const def = resolveRatePolicy("anthropic/claude-sonnet-4");
    expect(def.key).toBe("__default__");
    expect(def.policy.rpm).toBe(60);
  });
});

describe("rate-policy — application", () => {
  it("borne la concurrence : au-delà de maxConcurrent, l'acquisition attend une libération", async () => {
    _setRatePolicyForTest(
      { "owl-alpha": { rpm: 1000, maxConcurrent: 1, minIntervalMs: 0 } },
      { rpm: 1000, maxConcurrent: 8, minIntervalMs: 0 },
    );

    const k1 = await acquireSlot("owl-alpha");
    expect(_getBucketForTest("owl-alpha").active).toBe(1);

    // Deuxième acquisition : ne doit PAS résoudre tant que le slot n'est pas libéré.
    let secondAcquired = false;
    const p2 = acquireSlot("owl-alpha").then((k) => {
      secondAcquired = true;
      return k;
    });
    await new Promise((r) => setTimeout(r, 60));
    expect(secondAcquired).toBe(false); // bloqué par maxConcurrent=1

    releaseSlot(k1);
    const k2 = await p2;
    expect(secondAcquired).toBe(true);
    releaseSlot(k2);
    expect(_getBucketForTest("owl-alpha").active).toBe(0);
  });

  it("borne le RPM : au-delà de rpm départs dans la fenêtre, l'acquisition attend", async () => {
    _setRatePolicyForTest(
      { burst: { rpm: 2, maxConcurrent: 10, minIntervalMs: 0 } },
      { rpm: 1000, maxConcurrent: 10, minIntervalMs: 0 },
    );
    // 2 départs autorisés immédiatement
    releaseSlot(await acquireSlot("burst"));
    releaseSlot(await acquireSlot("burst"));
    expect(_getBucketForTest("burst").recent).toBe(2);

    // Le 3e dépasse rpm=2 sur 60s → reste en attente.
    let third = false;
    void acquireSlot("burst").then((k) => {
      third = true;
      releaseSlot(k);
    });
    await new Promise((r) => setTimeout(r, 80));
    expect(third).toBe(false);
  });

  it("runWithRateLimit relâche le slot même si fn jette", async () => {
    _setRatePolicyForTest(
      { x: { rpm: 1000, maxConcurrent: 1, minIntervalMs: 0 } },
      { rpm: 1000, maxConcurrent: 1, minIntervalMs: 0 },
    );
    await expect(runWithRateLimit("x", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(_getBucketForTest("x").active).toBe(0); // libéré malgré l'exception
  });
});
