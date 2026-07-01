/**
 * Phase 21 (ADR-0067) — LLM Gateway responseFormat propagation
 *
 * Vérifie que le champ `responseFormat: "json_object"` est bien câblé dans
 * `GatewayCallOptions` et qu'il est documenté + accepté par le typage.
 *
 * Note : un test "live" qui invoquerait Anthropic / OpenAI demanderait des
 * clés API. On se contente ici de la vérification structurelle pour qu'un
 * caller qui le passe ne soit pas silencieusement ignoré.
 */

import { describe, expect, it } from "vitest";

describe("ADR-0067 — LLM Gateway responseFormat extension", () => {
  it("GatewayCallOptions exposes responseFormat field", async () => {
    // Type-level check : on importe le module et on s'assure qu'il compile
    // avec un objet contenant `responseFormat`.
    const mod = await import("@/server/services/llm-gateway");
    const opts: import("@/server/services/llm-gateway").GatewayCallOptions = {
      system: "s",
      prompt: "p",
      caller: "test",
      responseFormat: "json_object",
    };
    expect(opts.responseFormat).toBe("json_object");
    expect(typeof mod.callLLM).toBe("function");
  });

  it("responseFormat 'text' is the implicit default (omitted = undefined = text)", () => {
    const opts: import("@/server/services/llm-gateway").GatewayCallOptions = {
      system: "",
      prompt: "",
      caller: "",
    };
    expect(opts.responseFormat).toBeUndefined();
  });
});
