/**
 * WAKANDA SEED — Phase 2.5: Markets (ADR-0105 market kill-switch demo).
 *
 * Le brand seed pose le pays dans un blob JSON (`Strategy.context`), jamais dans
 * la colonne `Strategy.countryCode` — or le kill-switch marché filtre sur ce
 * countryCode ISO-2. Ce seed le pose réellement + garantit l'existence des
 * Country rows (self-contained si `seed-countries` n'a pas tourné).
 *
 * Démonstrateur multi-pays : 5 marques en Wakanda (WK) + Jabari Heritage en
 * marché voisin transfrontalier (Cameroun, CM). Shadowban WK ⇒ 5 marques
 * disparaissent, Jabari (CM) reste visible ; réintégration ⇒ tout revient.
 */

import type { PrismaClient } from "@prisma/client";
import { IDS } from "./constants";
import { track } from "./helpers";

export async function seedMarkets(prisma: PrismaClient) {
  // ── Currencies (idempotent) ────────────────────────────────────────
  const currencies = [
    { code: "WKD", name: "Wakandan Dollar", symbol: "Ⱳ", decimalPlaces: 0, usdRate: 600 },
    { code: "XAF", name: "Franc CFA BEAC", symbol: "FCFA", decimalPlaces: 0, usdRate: 600 },
  ];
  for (const c of currencies) {
    await prisma.currency.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // ── Countries (le kill-switch cible Country.code ; doivent exister) ──
  await prisma.country.upsert({
    where: { code: "WK" },
    update: {},
    create: {
      code: "WK",
      name: "Wakanda",
      primaryLanguage: "fr",
      currencyCode: "WKD",
      purchasingPowerIndex: 200,
      region: "AFRICA_CENTRAL",
      isFictional: true,
    },
  });
  await prisma.country.upsert({
    where: { code: "CM" },
    update: {},
    create: {
      code: "CM",
      name: "Cameroun",
      primaryLanguage: "fr",
      currencyCode: "XAF",
      purchasingPowerIndex: 100,
      region: "AFRICA_CENTRAL",
    },
  });
  track("Country", 2);

  // ── Tag countryCode ISO-2 réel sur les stratégies existantes ────────
  const wkStrategies = [
    IDS.stratBliss,
    IDS.stratVibranium,
    IDS.stratBrew,
    IDS.stratPanther,
    IDS.stratShuri,
  ];
  await prisma.strategy.updateMany({ where: { id: { in: wkStrategies } }, data: { countryCode: "WK" } });
  // Jabari Heritage = tourisme culturel transfrontalier → marché voisin (CM).
  await prisma.strategy.updateMany({ where: { id: IDS.stratJabari }, data: { countryCode: "CM" } });
  track("Strategy.countryCode", 6);

  console.log("[OK] Markets: WK (5 marques) + CM (1 marque) — démonstrateur kill-switch prêt");
}
