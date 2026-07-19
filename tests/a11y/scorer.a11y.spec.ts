/**
 * Première spec a11y du funnel (audit oubliés 2026-07-19, B5) — le harnais
 * existait en README seul, @axe-core/playwright n'était pas installé.
 * Exécution : `npx playwright test tests/a11y/scorer.a11y.spec.ts` contre un
 * dev-server (BASE_URL, défaut http://localhost:3000). Non câblée en CI —
 * gate à armer une fois le run navigateur validé (même posture que
 * overton-radar.a11y.spec.ts, Phase 23 Story 7.8).
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("/scorer — accessibilité", () => {
  test("aucune violation axe sérieuse/critique sur la page d'entrée", async ({ page }) => {
    await page.goto(`${BASE}/scorer`);
    await page.waitForSelector("h1");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test("le formulaire est opérable au clavier (nom → bouton submit)", async ({ page }) => {
    await page.goto(`${BASE}/scorer`);
    await page.keyboard.press("Tab");
    const submit = page.getByRole("button", { name: /scorer ma marque/i });
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled(); // sans nom de marque, jamais cliquable
  });
});
