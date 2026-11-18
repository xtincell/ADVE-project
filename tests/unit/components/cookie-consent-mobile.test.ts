// @vitest-environment jsdom
/**
 * Bandeau de cookies (lot 3, 18 novembre 2026) : une ligne en bas d'écran sur
 * mobile — il couvrait 181 px sur 812. Mêmes deux choix, même enregistrement.
 */
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CookieConsent } from "@/components/shared/cookie-consent";

const KEY = "lafusee:cookie-consent:v1";

beforeEach(() => { vi.stubGlobal("React", React); window.localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("CookieConsent", () => {
  it("garde les deux choix, en version courte pour le mobile", () => {
    render(React.createElement(CookieConsent));
    const dialog = screen.getByRole("dialog", { name: "Préférences cookies" });
    const buttons = dialog.querySelectorAll("button");
    expect([...buttons].map((b) => b.textContent)).toEqual(["RefuserEssentiels uniquement", "AccepterTout accepter", ""]);
    // la ligne mobile ne s'empile plus : une seule rangée, sans colonne
    expect(dialog.firstElementChild?.className).not.toMatch(/(^|\s)flex-col(\s|$)/);
  });

  it("« Refuser » enregistre les cookies essentiels seulement", () => {
    render(React.createElement(CookieConsent));
    fireEvent.click(screen.getByText("Refuser"));
    expect(window.localStorage.getItem(KEY)).toBe("essential-only");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("« Accepter » enregistre l'accord", () => {
    render(React.createElement(CookieConsent));
    fireEvent.click(screen.getByText("Accepter"));
    expect(window.localStorage.getItem(KEY)).toBe("accepted");
  });

  it("ne s'affiche plus une fois le choix fait", () => {
    window.localStorage.setItem(KEY, "accepted");
    render(React.createElement(CookieConsent));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
