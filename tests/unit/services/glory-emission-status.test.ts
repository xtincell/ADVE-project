/**
 * Émission INVOKE_GLORY_TOOL — la clôture écrit aussi la colonne `status`.
 *
 * Premier relevé SLO réel (12 novembre) : les sept émissions INVOKE_GLORY_TOOL
 * de la fenêtre avaient `completedAt` et `result.status`, mais leur colonne
 * `status` restait PENDING. Le contrôle SLO ne compte comme erreur que
 * `status = FAILED` : un outil échoué y passait pour réussi, et le balayage des
 * émissions abandonnées ne les rattrapait pas (il ne vise que `completedAt` nul).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { toolEmissionStatus } from "@/server/services/artemis/tools/emission-status";

const ENGINE = readFileSync(
  join(__dirname, "..", "..", "..", "src/server/services/artemis/tools/engine.ts"),
  "utf8",
);

describe("statut de colonne d'une émission Glory", () => {
  it("un résultat OK ou COMPLETED est OK", () => {
    expect(toolEmissionStatus("OK")).toBe("OK");
    expect(toolEmissionStatus("COMPLETED")).toBe("OK");
  });

  it("un résultat FAILED est FAILED, ce que le contrôle SLO compte comme erreur", () => {
    expect(toolEmissionStatus("FAILED")).toBe("FAILED");
  });

  it("un résultat différé ou à saisir à la main n'est ni un succès ni une erreur", () => {
    expect(toolEmissionStatus("DEFERRED_AWAITING_CREDENTIALS")).toBe("DOWNGRADED");
    expect(toolEmissionStatus("MANUAL_ENTRY_REQUIRED")).toBe("DOWNGRADED");
    expect(toolEmissionStatus(undefined)).toBe("DOWNGRADED");
  });

  it("chaque clôture d'émission du moteur écrit la colonne status", () => {
    const updates = [...ENGINE.matchAll(/db\.intentEmission\.update\(\{[\s\S]*?\}\);/g)].map((m) => m[0]);
    expect(updates.length).toBeGreaterThanOrEqual(5);
    for (const u of updates) {
      expect(u, u.slice(0, 160)).toMatch(/status:\s*toolEmissionStatus\(/);
    }
  });
});
