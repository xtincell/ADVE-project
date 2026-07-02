import { describe, expect, it } from "vitest";
import {
  ACADEMY_MODULES,
  CASE_STUDIES,
  DRIVER_CHANNELS,
  DRIVER_TYPES,
  PILLAR_TEACHINGS,
  availableLessons,
  getCaseStudy,
  getLesson,
  getModule,
  lessonAvailable,
  moduleLessonStats,
} from "@/components/academy/content";
import { PILLARS } from "@/domain/pillars";

/**
 * Académie (WP-020) — intégrité du contenu pédagogique porté du legacy.
 * Le contrat : slugs uniques (ce sont des URLs), références résolues, et
 * honnêteté structurelle — une leçon « disponible » a un corps, une leçon
 * sans corps legacy n'en a pas (rien d'inventé).
 */
describe("académie — contenu porté", () => {
  it("les slugs de modules sont uniques (URLs)", () => {
    const slugs = ACADEMY_MODULES.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("les slugs de leçons sont uniques dans chaque module", () => {
    for (const courseModule of ACADEMY_MODULES) {
      const slugs = courseModule.lessons.map((l) => l.slug);
      expect(new Set(slugs).size, courseModule.slug).toBe(slugs.length);
    }
  });

  it("chaque module déclare sa provenance legacy et au moins une leçon", () => {
    for (const courseModule of ACADEMY_MODULES) {
      expect(courseModule.source, courseModule.slug).toMatch(/legacy/);
      expect(courseModule.lessons.length, courseModule.slug).toBeGreaterThan(0);
    }
  });

  it("toute référence d'étude de cas se résout", () => {
    for (const courseModule of ACADEMY_MODULES) {
      for (const lesson of courseModule.lessons) {
        for (const block of lesson.blocks ?? []) {
          if (block.type === "etude-de-cas") {
            expect(getCaseStudy(block.caseId), `${courseModule.slug}/${lesson.slug}`).not.toBeNull();
          }
        }
      }
    }
  });

  it("une leçon disponible a un corps ; les stats de module en découlent", () => {
    for (const courseModule of ACADEMY_MODULES) {
      const stats = moduleLessonStats(courseModule);
      expect(stats.total).toBe(courseModule.lessons.length);
      expect(stats.available).toBe(
        courseModule.lessons.filter((l) => (l.blocks?.length ?? 0) > 0).length,
      );
      expect(availableLessons(courseModule).every(lessonAvailable)).toBe(true);
    }
  });

  it("le socle porté est ouvrable : fondamentaux, drivers et les 3 cas d'école", () => {
    // Ces corps existaient réellement en code legacy — ils doivent être là.
    expect(moduleLessonStats(getModule("adve-fondamentaux")!).available).toBeGreaterThanOrEqual(3);
    expect(moduleLessonStats(getModule("maitriser-drivers")!).available).toBeGreaterThanOrEqual(2);
    expect(moduleLessonStats(getModule("etudes-de-cas")!).available).toBe(3);
  });

  it("les modules du catalogue seedé sans corps legacy restent fermés (rien d'inventé)", () => {
    expect(moduleLessonStats(getModule("cult-marketing")!).available).toBe(0);
    expect(moduleLessonStats(getModule("production-creative")!).available).toBe(0);
  });

  it("les 8 piliers sont enseignés, une fois chacun, sur les clés canon", () => {
    expect(PILLAR_TEACHINGS.map((p) => p.key)).toEqual([...PILLARS]);
    for (const pillar of PILLAR_TEACHINGS) {
      expect(pillar.question.length).toBeGreaterThan(10);
      expect(pillar.description.length).toBeGreaterThan(40);
    }
  });

  it("la cartographie des drivers porte les 13 canaux legacy, types au registre", () => {
    expect(DRIVER_CHANNELS).toHaveLength(13);
    const keys = DRIVER_CHANNELS.map((c) => c.channel);
    expect(new Set(keys).size).toBe(keys.length);
    for (const channel of DRIVER_CHANNELS) {
      expect(DRIVER_TYPES).toContain(channel.driverType);
    }
  });

  it("les 3 études de cas sont complètes et pointent des piliers canon", () => {
    expect(CASE_STUDIES).toHaveLength(3);
    for (const caseStudy of CASE_STUDIES) {
      expect(caseStudy.results.length).toBeGreaterThan(0);
      expect(caseStudy.lessons.length).toBeGreaterThan(0);
      for (const key of caseStudy.pillars) expect(PILLARS).toContain(key);
    }
  });

  it("getLesson navigue module/leçon et refuse l'inconnu", () => {
    const found = getLesson("adve-fondamentaux", "les-8-piliers");
    expect(found?.lesson.title).toBe("Les 8 piliers expliqués");
    expect(getLesson("adve-fondamentaux", "inconnue")).toBeNull();
    expect(getLesson("inconnu", "x")).toBeNull();
    expect(getModule("inconnu")).toBeNull();
  });
});
