import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * F13 — premier clic « Sources » après rechargement (recette 415/419).
 *
 * Après un rechargement sur une version dont la note n'a pas été vue, la barre
 * latérale est cliquable avant que « Quoi de neuf » ne s'ouvre (après hydratation et
 * lecture de session). Le geste visé sur « Sources » à ce moment-là doit naviguer :
 * avant correctif, il tombait sur le fond du modal, le refermait, et ne naviguait pas.
 * Le clic est donné par coordonnées, comme un utilisateur qui vise le lien vu à
 * l'écran : aucune attente d'actionnabilité ne doit masquer un intercepteur.
 */
// Fenêtre de bureau où l'entrée Sources est visible sans défiler la barre latérale.
test.use({ viewport: { width: 1440, height: 900 } });

test("le premier clic sur Sources navigue même quand « Quoi de neuf » vient de s'ouvrir", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("lafusee:cookie-consent:v1", "essential-only");
      localStorage.setItem("lafusee:welcome:cockpit:v1", "seen");
      localStorage.removeItem("lafusee.whatsNew.lastSeenVersion"); // version courante pas encore vue
    } catch {}
  });
  await loginAsAdmin(page);

  await page.goto("/cockpit");
  const sources = page.locator('nav[aria-label="Navigation principale"] a[href^="/cockpit/brand/sources"]').first();
  await expect(sources).toBeVisible();
  await sources.scrollIntoViewIfNeeded();
  const box = await sources.boundingBox();
  expect(box).not.toBeNull();
  // La note s'est ouverte pendant que le geste était visé.
  await expect(page.getByRole("dialog").filter({ hasText: "Quoi de neuf" })).toBeVisible();

  await page.mouse.click(box!.x + box!.width / 3, box!.y + box!.height / 2);

  await expect(page).toHaveURL(/\/cockpit\/brand\/sources(\?|$)/, { timeout: 15_000 });
  await expect(page.getByRole("dialog").filter({ hasText: "Quoi de neuf" })).toHaveCount(0);
});
