import { afterEach, describe, expect, it } from "vitest";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  computeExpiry,
  DEFAULT_WHATSAPP_NUMBER,
  hasActiveAt,
  operatorWhatsAppNumber,
  PLAN_PERIOD_DAYS,
  shortReference,
  subscriptionIsActiveAt,
} from "@/server/finance";

/**
 * Cœur PUR de la finance (WP-007) — échéances, refus de double souscription,
 * référence, WhatsApp. Zéro DB : ces fonctions sont extraites précisément
 * pour être testables à sec.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-07-01T10:00:00.000Z");

describe("computeExpiry — échéances de plan", () => {
  it("cockpit : +30 jours exactement", () => {
    const expiry = computeExpiry("cockpit", T0);
    expect(expiry.getTime() - T0.getTime()).toBe(30 * DAY_MS);
    expect(expiry.toISOString()).toBe("2026-07-31T10:00:00.000Z");
  });

  it("retainer : +92 jours exactement (trimestre)", () => {
    const expiry = computeExpiry("retainer", T0);
    expect(expiry.getTime() - T0.getTime()).toBe(92 * DAY_MS);
    expect(expiry.toISOString()).toBe("2026-10-01T10:00:00.000Z");
  });

  it("est pure : même entrée → même sortie, `from` non muté", () => {
    const from = new Date(T0);
    expect(computeExpiry("cockpit", from).getTime()).toBe(
      computeExpiry("cockpit", from).getTime(),
    );
    expect(from.getTime()).toBe(T0.getTime());
  });

  it("les durées canon restent 30/92 (contrat du produit, pas un détail)", () => {
    expect(PLAN_PERIOD_DAYS).toEqual({ cockpit: 30, retainer: 92 });
  });
});

describe("subscriptionIsActiveAt / hasActiveAt — refus de double souscription", () => {
  const active = { status: "active", expiresAt: new Date(T0.getTime() + DAY_MS) };
  const echue = { status: "active", expiresAt: new Date(T0.getTime() - DAY_MS) };
  const pending = { status: "pending_manual", expiresAt: null };
  const rejected = { status: "rejected", expiresAt: null };

  it("active + échéance future → active", () => {
    expect(subscriptionIsActiveAt(active, T0)).toBe(true);
  });

  it("active mais échue → inactive (l'accès tombe à l'échéance)", () => {
    expect(subscriptionIsActiveAt(echue, T0)).toBe(false);
  });

  it("échéance exactement à l'instant t → inactive (strictement future)", () => {
    expect(subscriptionIsActiveAt({ status: "active", expiresAt: T0 }, T0)).toBe(false);
  });

  it("pending_manual n'accorde RIEN (expiresAt null)", () => {
    expect(subscriptionIsActiveAt(pending, T0)).toBe(false);
  });

  it("active sans expiresAt → inactive (pas d'accès perpétuel implicite)", () => {
    expect(subscriptionIsActiveAt({ status: "active", expiresAt: null }, T0)).toBe(false);
  });

  it("hasActiveAt refuse dès qu'UNE souscription du lot est active", () => {
    expect(hasActiveAt([pending, echue, active], T0)).toBe(true);
  });

  it("hasActiveAt accepte un historique sans rien d'actif (pending/échue/rejetée)", () => {
    expect(hasActiveAt([pending, echue, rejected], T0)).toBe(false);
    expect(hasActiveAt([], T0)).toBe(false);
  });
});

describe("shortReference — référence de réconciliation WhatsApp", () => {
  it("dérive une référence courte déterministe de l'id", () => {
    expect(shortReference("cmcklzq3x0000356o55n8r0aa")).toBe("LF-55N8R0AA");
    expect(shortReference("cmcklzq3x0000356o55n8r0aa")).toBe(
      shortReference("cmcklzq3x0000356o55n8r0aa"),
    );
  });

  it("deux ids différents → deux références différentes (suffixes distincts)", () => {
    expect(shortReference("aaaaaaaaaaaaaaaaaaaaaa001")).not.toBe(
      shortReference("aaaaaaaaaaaaaaaaaaaaaa002"),
    );
  });
});

describe("WhatsApp — numéro opérateur + lien pré-rempli", () => {
  const ENV_KEY = "MANUAL_PAYMENT_WHATSAPP";
  const saved = process.env[ENV_KEY];

  afterEach(() => {
    if (saved === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = saved;
  });

  it("défaut legacy vérifié quand l'env est absente", () => {
    delete process.env[ENV_KEY];
    expect(operatorWhatsAppNumber()).toBe(DEFAULT_WHATSAPP_NUMBER);
    expect(DEFAULT_WHATSAPP_NUMBER).toBe("237694171799");
  });

  it("lit MANUAL_PAYMENT_WHATSAPP et ne garde que les chiffres", () => {
    process.env[ENV_KEY] = "+237 6 94 17 17 99";
    expect(operatorWhatsAppNumber()).toBe("237694171799");
  });

  it("valeur env sans aucun chiffre → retombe sur le défaut (jamais de wa.me vide)", () => {
    process.env[ENV_KEY] = "non-configuré";
    expect(operatorWhatsAppNumber()).toBe(DEFAULT_WHATSAPP_NUMBER);
  });

  it("le message contient plan, montant, devise et référence — le lien l'encode", () => {
    const message = buildWhatsAppMessage("cockpit", 8000, "XOF", "LF-ABCD1234");
    expect(message).toContain("Cockpit");
    expect(message).toContain("8000 XOF");
    expect(message).toContain("LF-ABCD1234");

    const url = buildWhatsAppUrl("237694171799", message);
    expect(url.startsWith("https://wa.me/237694171799?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1] ?? "")).toBe(message);
  });
});
