import { describe, expect, it } from "vitest";
import { averageRoundedScore, fleetSubscriptionSnapshot } from "@/server/agency";

/**
 * Cœur PUR de la vue flotte agence (/agence) — réduction de l'historique de
 * souscriptions d'un workspace à un statut lisible, et moyenne des scores.
 * Zéro DB : mêmes garanties de pureté que finance-dates.test.ts.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-07-02T10:00:00.000Z");

const future = new Date(T0.getTime() + 10 * DAY_MS);
const farFuture = new Date(T0.getTime() + 40 * DAY_MS);
const past = new Date(T0.getTime() - 10 * DAY_MS);
const olderPast = new Date(T0.getTime() - 40 * DAY_MS);

describe("fleetSubscriptionSnapshot — précédence active > pending > expired > none", () => {
  it("workspace sans aucune souscription → none", () => {
    expect(fleetSubscriptionSnapshot([], T0)).toEqual({ status: "none", expiresAt: null });
  });

  it("une active à échéance future → active, avec son échéance", () => {
    const snap = fleetSubscriptionSnapshot(
      [{ status: "active", expiresAt: future }],
      T0,
    );
    expect(snap.status).toBe("active");
    expect(snap.expiresAt).toEqual(future);
  });

  it("active PRIME sur pending et sur une période échue", () => {
    const snap = fleetSubscriptionSnapshot(
      [
        { status: "pending_manual", expiresAt: null },
        { status: "active", expiresAt: past }, // échue
        { status: "active", expiresAt: future },
      ],
      T0,
    );
    expect(snap.status).toBe("active");
    expect(snap.expiresAt).toEqual(future);
  });

  it("plusieurs actives → l'échéance la plus lointaine fait foi", () => {
    const snap = fleetSubscriptionSnapshot(
      [
        { status: "active", expiresAt: future },
        { status: "active", expiresAt: farFuture },
      ],
      T0,
    );
    expect(snap.expiresAt).toEqual(farFuture);
  });

  it("pending_manual sans active → pending (la demande n'accorde rien)", () => {
    const snap = fleetSubscriptionSnapshot(
      [{ status: "pending_manual", expiresAt: null }],
      T0,
    );
    expect(snap).toEqual({ status: "pending", expiresAt: null });
  });

  it("pending PRIME sur une période échue (une demande est en cours)", () => {
    const snap = fleetSubscriptionSnapshot(
      [
        { status: "active", expiresAt: past },
        { status: "pending_manual", expiresAt: null },
      ],
      T0,
    );
    expect(snap.status).toBe("pending");
  });

  it("période validée échue (status active ou expired) → expired, dernière échéance", () => {
    const snap = fleetSubscriptionSnapshot(
      [
        { status: "expired", expiresAt: olderPast },
        { status: "active", expiresAt: past },
      ],
      T0,
    );
    expect(snap.status).toBe("expired");
    expect(snap.expiresAt).toEqual(past);
  });

  it("rejected seul → none (un refus n'est pas une période échue)", () => {
    const snap = fleetSubscriptionSnapshot(
      [{ status: "rejected", expiresAt: null }],
      T0,
    );
    expect(snap.status).toBe("none");
  });

  it("active sans expiresAt n'est PAS active (pas d'accès perpétuel implicite) ni échue", () => {
    const snap = fleetSubscriptionSnapshot(
      [{ status: "active", expiresAt: null }],
      T0,
    );
    expect(snap.status).toBe("none");
  });
});

describe("averageRoundedScore — moyenne des derniers scores connus", () => {
  it("aucun score → null (jamais un 0 inventé)", () => {
    expect(averageRoundedScore([])).toBeNull();
    expect(averageRoundedScore([null, undefined, null])).toBeNull();
  });

  it("ignore les marques sans score et moyenne le reste", () => {
    expect(averageRoundedScore([100, null, 50])).toBe(75);
  });

  it("arrondit à l'entier (affichage /200)", () => {
    expect(averageRoundedScore([100, 101])).toBe(101); // 100.5 → 101
    expect(averageRoundedScore([33.4])).toBe(33);
  });

  it("un vrai zéro compte comme un score (pas confondu avec « pas de score »)", () => {
    expect(averageRoundedScore([0, 100])).toBe(50);
  });
});
