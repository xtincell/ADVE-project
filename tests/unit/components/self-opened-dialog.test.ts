// @vitest-environment jsdom
/**
 * F13 — premier clic « Sources » sans effet après rechargement (recette 415/419).
 *
 * Cause reproduite sur build de production local (Chromium, 2026-11-11) : la note
 * « Quoi de neuf » s'ouvre d'elle-même ~100 ms APRÈS que la barre latérale est
 * visible et cliquable (session lue, version non vue). Elle était un modal bloquant :
 * le clic visé sur « Sources » tombait sur son fond, la refermait (version marquée
 * vue) et ne naviguait pas ; le second clic, note fermée, ouvrait la rubrique.
 * Sans note, 24 premiers clics sur 24 naviguent.
 *
 * Contrat : un dialogue ouvert de lui-même (note de version, accueil) ne capte aucun
 * geste destiné à la page. jsdom ne calcule pas le ciblage des pointeurs ; on vérifie
 * donc ce qui le détermine (racine `pointer-events-none`, contenu seul cliquable,
 * pas de modalité ni de prise de focus) et que la pression sur la page referme la
 * note sans être consommée. Le parcours navigateur est couvert par
 * tests/e2e/cockpit-first-click.spec.ts.
 */
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: { user: { name: "Recette Fictive", email: "recette@example.invalid" } } }),
}));
vi.mock("@/components/shared/portal-tour", () => ({ startPortalTour: vi.fn(), hasTourSteps: () => false }));

import { Dialog } from "@/components/primitives/dialog";
import { WhatsNewModal } from "@/components/cockpit/whats-new-modal";
import { PortalWelcome } from "@/components/shared/portal-welcome";
import { LATEST_RELEASE } from "@/lib/release-notes";

const NOTE_SEEN_KEY = "lafusee.whatsNew.lastSeenVersion";
const WELCOME_KEY = "lafusee:welcome:cockpit:v1";

/** La page déjà affichée : le lien de navigation que l'utilisateur vise. */
function PageWith({ children, onNavigate }: { children?: React.ReactNode; onNavigate: () => void }) {
  return React.createElement(React.Fragment, null,
    React.createElement("a", { href: "/cockpit/brand/sources", onClick: (e: React.MouseEvent) => { e.preventDefault(); onNavigate(); } }, "Sources"),
    children);
}

/** Geste complet tel que le navigateur le livre à la cible sous le pointeur. */
async function pressAndClick(target: HTMLElement) {
  await act(async () => {
    fireEvent.pointerDown(target);
    fireEvent.mouseDown(target);
    fireEvent.pointerUp(target);
    fireEvent.mouseUp(target);
    fireEvent.click(target);
  });
}

function expectNonBlocking(dialog: HTMLElement) {
  expect(dialog.getAttribute("aria-modal")).toBe("false");
  expect(dialog.className.split(/\s+/)).toContain("pointer-events-none");
  const content = dialog.querySelector("[tabindex='-1']") as HTMLElement;
  expect(content.className.split(/\s+/)).toContain("pointer-events-auto");
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  document.body.style.overflow = "";
});

describe("dialogue bloquant (défaut) — inchangé pour les dialogues ouverts par un geste", () => {
  it("reste modal, prend le focus et ne se ferme pas sur une pression hors contenu", async () => {
    const onOpenChange = vi.fn();
    render(React.createElement(Dialog, { open: true, onOpenChange, title: "Confirmer" }, "Corps"));
    await act(() => vi.runAllTimersAsync());
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.className.split(/\s+/)).not.toContain("pointer-events-none");
    expect(document.activeElement).toBe(dialog.querySelector("[tabindex='-1']"));
    fireEvent.pointerDown(document.body);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("dialogue ouvert de lui-même — ne vole aucun geste destiné à la page", () => {
  it("Dialog blocking={false} : la pression sur la page le referme et le clic atteint sa cible", async () => {
    const onOpenChange = vi.fn();
    const onNavigate = vi.fn();
    render(React.createElement(PageWith, { onNavigate },
      React.createElement(Dialog, { open: true, onOpenChange, blocking: false, title: "Note" }, "Corps")));
    const link = screen.getByRole("link", { name: "Sources" });
    link.focus();
    await act(() => vi.runAllTimersAsync());
    const dialog = screen.getByRole("dialog");
    expectNonBlocking(dialog);
    expect(document.activeElement).toBe(link); // pas de vol de focus
    expect(document.body.style.overflow).not.toBe("hidden"); // défilement libre
    await pressAndClick(link);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    // Une pression DANS la note ne la referme pas.
    onOpenChange.mockClear();
    fireEvent.pointerDown(screen.getByText("Corps"));
    expect(onOpenChange).not.toHaveBeenCalled();
    // Échap la referme toujours.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("« Quoi de neuf » après rechargement : le premier clic sur Sources navigue", async () => {
    expect(LATEST_RELEASE).not.toBeNull();
    localStorage.setItem(WELCOME_KEY, "seen"); // accueil déjà vu, version courante pas encore vue
    const onNavigate = vi.fn();
    render(React.createElement(PageWith, { onNavigate }, React.createElement(WhatsNewModal)));
    const link = screen.getByRole("link", { name: "Sources" });
    link.focus();
    await act(() => vi.runAllTimersAsync());
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Quoi de neuf");
    expectNonBlocking(dialog);
    expect(document.activeElement).toBe(link);
    await pressAndClick(link);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem(NOTE_SEEN_KEY)).toBe(LATEST_RELEASE!.version);
  });

  it("accueil du portail au premier passage : même contrat", async () => {
    const onNavigate = vi.fn();
    render(React.createElement(PageWith, { onNavigate }, React.createElement(PortalWelcome, { portal: "cockpit" })));
    const link = screen.getByRole("link", { name: "Sources" });
    link.focus();
    await act(() => vi.runAllTimersAsync());
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Bienvenue");
    expectNonBlocking(dialog);
    expect(document.activeElement).toBe(link);
    await pressAndClick(link);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem(WELCOME_KEY)).toBe("seen");
  });
});
