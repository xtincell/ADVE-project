/**
 * Anti-drift — attribution des transitions de dévotion (ADR-0135, audit T7).
 *
 * Ranime la chaîne attribution/calibration qui lisait
 * `CampaignAction.devotionTransitionsObserved` — un champ que PERSONNE
 * n'écrivait. Invariants :
 *   1. last-touch dans la fenêtre : l'action la plus récemment active avant
 *      l'observation, bornée (rappel 45j + latence 14j) ;
 *   2. une transition non rattachable N'EST PAS forcée sur une action ;
 *   3. agrégation `{from,to,count}` compatible avec les deux lecteurs
 *      (Phase 19 sumTransitionsTo + Phase 23 extractLabel) ;
 *   4. le kind est catalogué (kind + SLO + union + case + cron) ;
 *   5. l'enregistrement de transition ne se fait QUE sur montée de rung d'un
 *      profil EXISTANT (une naissance n'est pas une transition observée).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  lastTouchActionId,
  aggregateMeasured,
  MEASURED_SOURCE,
  ATTRIBUTION_LOOKBACK_DAYS,
  type ActionWindow,
  type ObservedTransition,
} from "@/server/services/campaign-tracker/devotion-attribution";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");
const d = (iso: string) => new Date(iso);

describe("ADR-0135 — attribution last-touch (pure)", () => {
  const actions: ActionWindow[] = [
    { id: "old", startDate: d("2026-05-01"), endDate: d("2026-05-10") },
    { id: "recent", startDate: d("2026-06-20"), endDate: d("2026-06-30") },
    { id: "future", startDate: d("2026-08-01"), endDate: d("2026-08-10") },
  ];

  it("choisit l'action la plus récemment active avant l'observation", () => {
    // Transition le 2026-06-25 : dans la fenêtre de « recent », pas « old ».
    expect(lastTouchActionId(d("2026-06-25"), actions)).toBe("recent");
  });

  it("tolère la latence d'effet après la fin (14j)", () => {
    // 10 j après la fin de « recent » (30 juin → 10 juillet) : encore attribué.
    expect(lastTouchActionId(d("2026-07-10"), actions)).toBe("recent");
  });

  it("n'attribue pas à une action postérieure à la transition", () => {
    // Avant toute action de 2026 : « old » commence le 1er mai.
    expect(lastTouchActionId(d("2026-04-01"), actions)).toBeNull();
  });

  it("n'attribue pas au-delà de la fenêtre de rappel (transition trop récente vs action)", () => {
    // 60 j après le début de la SEULE action — au-delà de 45 j ET hors latence.
    const solo: ActionWindow[] = [{ id: "recent", startDate: d("2026-06-20"), endDate: d("2026-06-30") }];
    const late = d(new Date(d("2026-06-20").getTime() + 60 * 86_400_000).toISOString());
    expect(lastTouchActionId(late, solo)).toBeNull();
    expect(ATTRIBUTION_LOOKBACK_DAYS).toBe(45);
  });

  it("ignore les actions sans startDate", () => {
    expect(lastTouchActionId(d("2026-06-25"), [{ id: "x", startDate: null, endDate: null }])).toBeNull();
  });

  it("agrège en {from,to,count} compatible readers + marque MEASURED", () => {
    const ts: ObservedTransition[] = [
      { from: "AMBASSADEUR", to: "EVANGELISTE", observedAt: d("2026-06-25") },
      { from: "AMBASSADEUR", to: "EVANGELISTE", observedAt: d("2026-06-28") },
      { from: "PARTICIPANT", to: "ENGAGE", observedAt: d("2026-06-26") },
    ];
    const agg = aggregateMeasured(ts);
    const evang = agg.find((r) => r.to === "EVANGELISTE");
    expect(evang).toEqual({
      from: "AMBASSADEUR",
      to: "EVANGELISTE",
      count: 2,
      source: MEASURED_SOURCE,
      lastObservedAt: d("2026-06-28").toISOString(),
    });
    // Forme lue par extractLabel (to==="EVANGELISTE") et sumTransitionsTo (count).
    expect(typeof evang!.from).toBe("string");
    expect(typeof evang!.count).toBe("number");
  });
});

describe("ADR-0135 — câblage gouverné", () => {
  it("kind catalogué : intent-kinds + SLO + union + case + cron", () => {
    expect(read("src/server/governance/intent-kinds.ts")).toContain(
      'kind: "SESHAT_ATTRIBUTE_DEVOTION_TRANSITIONS"',
    );
    expect(read("src/server/governance/slos.ts")).toContain(
      'kind: "SESHAT_ATTRIBUTE_DEVOTION_TRANSITIONS"',
    );
    expect(read("src/server/services/mestor/intents.ts")).toContain(
      'kind: "SESHAT_ATTRIBUTE_DEVOTION_TRANSITIONS"',
    );
    expect(read("src/server/services/artemis/commandant.ts")).toContain(
      'case "SESHAT_ATTRIBUTE_DEVOTION_TRANSITIONS"',
    );
    const cron = read("src/app/api/cron/social-sync/route.ts");
    expect(cron).toContain('kind: "SESHAT_ATTRIBUTE_DEVOTION_TRANSITIONS"');
    expect(cron).toContain('caller: "cron:social-sync:attribution"');
  });

  it("l'enregistrement de transition ne concerne QUE les montées de rang de profils existants", () => {
    const ingest = read("src/server/services/seshat/superfan-ingest.ts");
    // Garde `if (existing)` + comparaison de position monotone.
    // ADR-0141 : la comparaison porte sur le segment FINAL (dérivé des conditions
    // + de la profondeur plancher), pas sur le segment brut fourni en entrée.
    expect(ingest).toContain("if (existing) {");
    expect(ingest).toContain("devotionLadderPosition(finalSegment) > devotionLadderPosition(from)");
    expect(ingest).toContain("recordDevotionTransition");
  });
});
