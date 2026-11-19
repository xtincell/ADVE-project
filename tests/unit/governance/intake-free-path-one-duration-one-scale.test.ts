/**
 * Parcours gratuit — une seule durée, une seule échelle (lot 3, 18 novembre 2026).
 *
 * Constat du relevé de production : le diagnostic gratuit promettait trois
 * durées (« ~10 min », « 15 minutes environ », « ~15 min ») et trois échelles
 * (/5, /100, /200, plus /25 par pilier) ; la page de résultat affichait
 * « Débloquer le PDF — 49,00 € » sur une fiche sans pays.
 *
 * Règles verrouillées ici :
 *  - une durée : 4 minutes environ (médiane mesurée en base le 18 novembre
 *    2026 sur les diagnostics terminés, hors script automatique : 235 s) ;
 *  - une échelle : /100 ; le /200 n'apparaît qu'en une phrase sur la page de
 *    résultat (intakeResult.next200), comme ce que débloque la suite ;
 *  - un prix : sans pays déclaré, le prix est celui de la zone FCFA (CM), le
 *    même à l'affichage et à l'encaissement.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { intakeEntryEn, intakeEntryFr, intakeEntryZh } from "@/lib/i18n/pages/intake-entry";
import { intakeResultEn, intakeResultFr, intakeResultZh } from "@/lib/i18n/pages/intake-result";
import { fr } from "@/lib/i18n/fr";
import { en } from "@/lib/i18n/en";
import { zh } from "@/lib/i18n/zh";
import { INTAKE_DEFAULT_PRICING_COUNTRY, intakePricingCountry } from "@/lib/constants/intake-options";

const ROOT = join(__dirname, "../../..");
const read = (file: string) => readFileSync(join(ROOT, file), "utf-8");

const OTHER_DURATIONS = /(~\s?1\s?min|\b1 minute|\b3-5 ?min|\b10 ?min|\b15 ?min|\b20 ?min|约 ?(?:1|3-5|10|15|20) ?分钟)/i;

describe("une seule durée : 4 minutes environ", () => {
  it("l'entrée du diagnostic annonce la même durée dans les trois langues", () => {
    expect(intakeEntryFr["intake.hero.title.highlight"]).toBe("4 minutes environ");
    expect(intakeEntryFr["intake.badge.duration"]).toBe("4 min environ");
    expect(intakeEntryEn["intake.hero.title.highlight"]).toBe("about 4 minutes");
    expect(intakeEntryZh["intake.hero.title.highlight"]).toBe("约 4 分钟");
    expect(fr["landing.nav.cta"]).toBe("Diagnostic gratuit — 4 min");
    expect(en["landing.nav.cta"]).toBe("Free diagnostic — 4 min");
    expect(zh["landing.nav.cta"]).toBe("免费诊断 — 4分钟");
  });

  it("aucune autre durée n'est promise sur l'entrée du diagnostic", () => {
    for (const dict of [intakeEntryFr, intakeEntryEn, intakeEntryZh]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(`${key}: ${value}`).not.toMatch(OTHER_DURATIONS);
      }
    }
  });

  it("les pages publiques du parcours n'affichent plus d'autre durée", () => {
    const files = [
      "src/app/(intake)/intake/page.tsx",
      "src/app/(intake)/score/page.tsx",
      "src/app/(marketing)/page.tsx",
      "src/components/landing/marketing-hero.tsx",
      "src/components/landing/diagnostic-modal.tsx",
      "src/components/landing/marketing-faq.tsx",
      "src/components/landing/marketing-pricing.tsx",
      "src/components/landing/marketing-diagnostic.tsx",
    ];
    for (const file of files) {
      const rendered = read(file).split("\n").filter((line) => !/^\s*(\/\/|\*|\{\/\*)/.test(line)).join("\n");
      expect(rendered, file).not.toMatch(OTHER_DURATIONS);
    }
  });
});

describe("une seule échelle : /100, le /200 en une phrase", () => {
  it("l'entrée du diagnostic ne parle plus de /200", () => {
    for (const dict of [intakeEntryFr, intakeEntryEn, intakeEntryZh]) {
      for (const value of Object.values(dict)) expect(value).not.toMatch(/\b200\b/);
    }
  });

  it("la page de résultat cite le /200 par une seule clé, et n'affiche plus de /25", () => {
    const page = read("src/app/(intake)/intake/[token]/result/page.tsx");
    const mentions = page.match(/t\("intakeResult\.[A-Za-z0-9.]+"\)/g)?.filter((call) => {
      const key = call.slice(3, -2) as keyof typeof intakeResultFr;
      return /\b200\b/.test(intakeResultFr[key] ?? "");
    }) ?? [];
    expect([...new Set(mentions)]).toEqual(['t("intakeResult.next200")']);
    expect(page).not.toMatch(/\/\s?25\b/);
    expect(page).not.toMatch(/<ForceSection\b/);
    for (const dict of [intakeResultFr, intakeResultEn, intakeResultZh]) {
      expect(dict["intakeResult.next200"]).toMatch(/200/);
    }
  });
});

describe("un prix : la zone FCFA quand la fiche n'a pas de pays", () => {
  it("retient le Cameroun par défaut, et le pays déclaré sinon", () => {
    expect(INTAKE_DEFAULT_PRICING_COUNTRY).toBe("CM");
    expect(intakePricingCountry(null)).toBe("CM");
    expect(intakePricingCountry(undefined)).toBe("CM");
    expect(intakePricingCountry("  ")).toBe("CM");
    expect(intakePricingCountry("CI")).toBe("CI");
    expect(intakePricingCountry("FR")).toBe("FR");
  });

  it("l'affichage et l'encaissement lisent la même règle (plus de repli sur la France)", () => {
    const page = read("src/app/(intake)/intake/[token]/result/page.tsx");
    const payment = read("src/server/trpc/routers/payment.ts");
    expect(page).not.toMatch(/country \?\? "FR"/);
    expect(page).toMatch(/intakePricingCountry\(intake\?\.country\)/);
    expect(payment).toMatch(/const country = intakePricingCountry\(intake\.country\);/);
  });
});
