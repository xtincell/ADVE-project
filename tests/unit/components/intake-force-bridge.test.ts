// @vitest-environment jsdom
/**
 * Résultat du diagnostic — la phrase « voici la force qu'elle révèle — le score
 * complet /200 » ne s'affiche que si cette force est réellement affichée (F16).
 * Avant : la phrase était posée par la page, même quand la section se taisait.
 */
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ForceSection } from "@/app/(intake)/intake/[token]/result/force-section";

const calls = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { quickIntake: { getForceByToken: { useQuery: calls.query } } } }));
vi.mock("@/lib/i18n/use-t", () => ({ useT: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/shared/overton-positioning", () => ({ OvertonPositioningView: () => null }));

const BRIDGE = "intakeResult.bridge.force";

beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("ForceSection — promesse du score /200", () => {
  it("se tait entièrement quand aucune force n'est calculée", () => {
    calls.query.mockReturnValue({ data: { status: "NO_BRAND" }, isLoading: false });
    render(React.createElement(ForceSection, { token: "t" }));
    expect(screen.queryByText(BRIDGE)).toBeNull();
  });

  it("annonce la force seulement quand elle est affichée", () => {
    calls.query.mockReturnValue({
      data: {
        status: "OK", force: 42, outOf: 200, tier: "FRAGILE", coveragePct: 40,
        measuredArenas: 2, totalArenas: 5, terrains: [], nextUnlock: [], overton: null,
      },
      isLoading: false,
    });
    render(React.createElement(ForceSection, { token: "t" }));
    expect(screen.getByText(BRIDGE)).toBeTruthy();
  });
});
