/**
 * scroll-lock.ts — verrou de défilement du `body` REF-COMPTÉ (audit adversarial 2026-07-22).
 *
 * Bug fermé : chaque composant modal (Dialog, Sheet, Modal, AppShell drawer, sélecteurs)
 * faisait son propre save/restore de `document.body.style.overflow`. Deux modaux
 * concurrents (ex. « Quoi de neuf » + PortalWelcome au 1er login) laissaient le body
 * bloqué `overflow:hidden` APRÈS fermeture : A capture "", pose hidden ; B capture
 * "hidden", pose hidden ; A restaure "" ; B restaure **"hidden"** → cockpit non-scrollable.
 *
 * Solution : UN compteur global. Le 1er lock mémorise l'overflow d'origine et pose hidden ;
 * seul le dernier unlock (compteur → 0) le restaure. Idempotent, SSR-safe.
 */

let lockCount = 0;
let savedOverflow: string | null = null;

/** Verrouille le défilement du body (ref-compté). À appairer avec `unlockBodyScroll`. */
export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount++;
}

/** Déverrouille (ref-compté) — ne restaure l'overflow d'origine qu'au dernier unlock. */
export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) return; // déjà déverrouillé — idempotent
  lockCount--;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow ?? "";
    savedOverflow = null;
  }
}
