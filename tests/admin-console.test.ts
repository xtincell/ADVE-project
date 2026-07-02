import { describe, expect, it } from "vitest";
import { computeSelfHash } from "@/server/audit-hash";
import {
  parsePage,
  subscriptionDisplayStatus,
  subscriptionFilterWhere,
  verifyChainRows,
  zoneIndexValidity,
  countryInputSchema,
  zoneIndexCreateSchema,
  type AuditChainRow,
} from "@/server/admin";

/**
 * WP-015 console vague 1 — les parties PURES du service admin :
 * vérification de chaîne d'audit (le cœur), statuts dérivés d'abonnement,
 * validité des lignes ZoneIndex, schémas référentiels.
 */

// ── Fabrique de chaînes d'audit valides (mêmes règles que logAudit) ─────

let seq = 0;

function makeRow(
  prev: AuditChainRow | null,
  partial: Partial<Omit<AuditChainRow, "selfHash" | "prevHash">> = {},
): AuditChainRow {
  seq += 1;
  const base = {
    id: partial.id ?? `row-${seq}`,
    // `?? "w1"` avalerait le null explicite (chaîne système) — test dédié.
    workspaceId: partial.workspaceId !== undefined ? partial.workspaceId : "w1",
    actorId: partial.actorId ?? null,
    action: partial.action ?? "subscription.approve",
    entity: partial.entity ?? null,
    entityId: partial.entityId ?? null,
    payload: partial.payload ?? null,
    createdAt: partial.createdAt ?? new Date(2026, 0, seq),
  };
  const prevHash = prev?.selfHash ?? null;
  return {
    ...base,
    prevHash,
    selfHash: computeSelfHash(prevHash, {
      workspaceId: base.workspaceId,
      actorId: base.actorId,
      action: base.action,
      entity: base.entity,
      entityId: base.entityId,
      payload: base.payload,
    }),
  };
}

function chain(length: number, workspaceId: string | null): AuditChainRow[] {
  const rows: AuditChainRow[] = [];
  for (let i = 0; i < length; i += 1) {
    rows.push(makeRow(rows[i - 1] ?? null, { workspaceId, payload: { n: i } }));
  }
  return rows;
}

describe("verifyChainRows — vérification de la chaîne d'audit", () => {
  it("valide une chaîne intacte (0 rupture)", () => {
    const rows = chain(5, "w1");
    const result = verifyChainRows(rows);
    expect(result.ok).toBe(true);
    expect(result.scanned).toBe(5);
    expect(result.chains).toBe(1);
    expect(result.breaks).toEqual([]);
    expect(result.boundaryUnverified).toBe(0);
  });

  it("détecte une ligne altérée a posteriori (HASH_ALTERE, localisée)", () => {
    const rows = chain(4, "w1");
    const tampered = rows.map((r, i) =>
      i === 2 ? { ...r, payload: { n: 999, injecte: true } } : r,
    );
    const result = verifyChainRows(tampered);
    expect(result.ok).toBe(false);
    expect(result.breaks).toHaveLength(1);
    expect(result.breaks[0]).toMatchObject({ id: rows[2]!.id, reason: "HASH_ALTERE" });
  });

  it("détecte un maillon supprimé (CHAINAGE_ROMPU) en fenêtre complète", () => {
    const rows = chain(4, "w1");
    const withoutSecond = [rows[0]!, rows[2]!, rows[3]!];
    const result = verifyChainRows(withoutSecond);
    expect(result.ok).toBe(false);
    expect(result.breaks).toHaveLength(1);
    expect(result.breaks[0]).toMatchObject({ id: rows[2]!.id, reason: "CHAINAGE_ROMPU" });
  });

  it("tolère une fourche concurrente (deux maillons partagent le même prevHash)", () => {
    const a = chain(1, "w1")[0]!;
    const b = makeRow(a, { payload: { branch: "b" } });
    const c = { ...makeRow(a, { payload: { branch: "c" } }) }; // même amont que b
    const result = verifyChainRows([a, b, c]);
    expect(result.ok).toBe(true);
    expect(result.breaks).toEqual([]);
  });

  it("vérifie chaque chaîne indépendamment (workspace + système)", () => {
    const w1 = chain(3, "w1");
    const system = chain(3, null);
    const tamperedSystem = system.map((r, i) => (i === 1 ? { ...r, action: "hack" } : r));
    const result = verifyChainRows([...w1, ...tamperedSystem]);
    expect(result.chains).toBe(2);
    expect(result.breaks).toHaveLength(1);
    expect(result.breaks[0]!.workspaceId).toBeNull();
  });

  it("fenêtre bornée : l'amont hors intervalle n'est pas une rupture", () => {
    const rows = chain(5, "w1");
    const windowRows = rows.slice(2); // début de fenêtre au 3e maillon
    const bounded = verifyChainRows(windowRows, { windowBounded: true });
    expect(bounded.ok).toBe(true);
    expect(bounded.boundaryUnverified).toBe(1); // le premier maillon de la fenêtre
    // La même coupe SANS borne déclarée est une vraie rupture.
    const unbounded = verifyChainRows(windowRows);
    expect(unbounded.ok).toBe(false);
  });

  it("l'altération reste détectée même en fenêtre bornée", () => {
    const rows = chain(5, "w1");
    const windowRows = rows.slice(2).map((r, i) => (i === 1 ? { ...r, entityId: "x" } : r));
    const result = verifyChainRows(windowRows, { windowBounded: true });
    expect(result.ok).toBe(false);
    expect(result.breaks[0]!.reason).toBe("HASH_ALTERE");
  });

  it("refuse un prevHash null au milieu d'une chaîne (fenêtre complète)", () => {
    const rows = chain(3, "w1");
    const orphan = makeRow(null, { workspaceId: "w1", payload: { orphan: true } });
    const result = verifyChainRows([...rows, orphan]);
    expect(result.ok).toBe(false);
    expect(result.breaks[0]!.reason).toBe("CHAINAGE_ROMPU");
  });

  it("tolère deux racines concurrentes (fourche à l'origine, prevHash null partagé)", () => {
    const rootA = makeRow(null, { workspaceId: "w1", payload: { r: "a" } });
    const rootB = makeRow(null, { workspaceId: "w1", payload: { r: "b" } });
    const result = verifyChainRows([rootA, rootB]);
    expect(result.ok).toBe(true);
  });
});

// ── Statut d'abonnement dérivé (règles finance réutilisées) ─────────────

describe("subscriptionDisplayStatus — dérivé des règles finance", () => {
  const now = new Date("2026-07-02T12:00:00Z");
  const future = new Date("2026-08-01T00:00:00Z");
  const past = new Date("2026-06-01T00:00:00Z");

  it("pending_manual → pending", () => {
    expect(subscriptionDisplayStatus({ status: "pending_manual", expiresAt: null }, now)).toBe(
      "pending",
    );
  });

  it("active + échéance future → active", () => {
    expect(subscriptionDisplayStatus({ status: "active", expiresAt: future }, now)).toBe("active");
  });

  it("active + échéance passée → expired (le champ status ne fait pas foi seul)", () => {
    expect(subscriptionDisplayStatus({ status: "active", expiresAt: past }, now)).toBe("expired");
  });

  it("active sans échéance → expired (pas d'accès perpétuel implicite)", () => {
    expect(subscriptionDisplayStatus({ status: "active", expiresAt: null }, now)).toBe("expired");
  });

  it("rejected / cancelled / inconnu", () => {
    expect(subscriptionDisplayStatus({ status: "rejected", expiresAt: null }, now)).toBe("rejected");
    expect(subscriptionDisplayStatus({ status: "cancelled", expiresAt: null }, now)).toBe(
      "cancelled",
    );
    expect(subscriptionDisplayStatus({ status: "trialing", expiresAt: null }, now)).toBe("unknown");
  });
});

describe("subscriptionFilterWhere — clauses des filtres", () => {
  const now = new Date("2026-07-02T12:00:00Z");

  it("actifs = status active ET échéance strictement future", () => {
    expect(subscriptionFilterWhere("actifs", now)).toEqual({
      status: "active",
      expiresAt: { gt: now },
    });
  });

  it("expirent_7j = fenêtre (now, now+7j]", () => {
    const where = subscriptionFilterWhere("expirent_7j", now);
    expect(where.status).toBe("active");
    const range = where.expiresAt as { gt: Date; lte: Date };
    expect(range.gt).toEqual(now);
    expect(range.lte.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("echus couvre expired, active périmé et active sans échéance", () => {
    const where = subscriptionFilterWhere("echus", now);
    expect(where.OR).toHaveLength(3);
  });

  it("tous = aucune contrainte", () => {
    expect(subscriptionFilterWhere("tous", now)).toEqual({});
  });
});

// ── Référentiels : validité ZoneIndex + schémas ─────────────────────────

describe("zoneIndexValidity", () => {
  const at = new Date("2026-07-02T00:00:00Z");

  it("en vigueur : validFrom passé, pas de fin (ou fin future)", () => {
    expect(zoneIndexValidity({ validFrom: new Date("2026-01-01"), validUntil: null }, at)).toBe(
      "en_vigueur",
    );
    expect(
      zoneIndexValidity(
        { validFrom: new Date("2026-01-01"), validUntil: new Date("2027-01-01") },
        at,
      ),
    ).toBe("en_vigueur");
  });

  it("programmé : validFrom futur", () => {
    expect(zoneIndexValidity({ validFrom: new Date("2026-09-01"), validUntil: null }, at)).toBe(
      "programme",
    );
  });

  it("clos : validUntil atteint", () => {
    expect(
      zoneIndexValidity(
        { validFrom: new Date("2026-01-01"), validUntil: new Date("2026-06-01") },
        at,
      ),
    ).toBe("clos");
  });
});

describe("schémas référentiels", () => {
  it("countryInputSchema normalise code/devise en majuscules, zone vide → null", () => {
    const parsed = countryInputSchema.parse({
      code: "ci",
      name: "Côte d'Ivoire",
      currency: "xof",
      zone: "",
    });
    expect(parsed).toEqual({ code: "CI", name: "Côte d'Ivoire", currency: "XOF", zone: null });
  });

  it("zoneIndexCreateSchema exige une source (jamais de valeur sans provenance)", () => {
    const result = zoneIndexCreateSchema.safeParse({
      family: "pricing",
      countryCode: "UEMOA",
      key: "plan.cockpit.monthly",
      value: "8000",
      source: "",
      validFrom: "2026-07-01",
      validUntil: "",
    });
    expect(result.success).toBe(false);
  });

  it("zoneIndexCreateSchema accepte une ligne complète et coerce la valeur", () => {
    const result = zoneIndexCreateSchema.parse({
      family: "cost-of-living",
      countryCode: "cm",
      key: "index.general",
      value: "0.82",
      source: "Numbeo 2026-06",
      validFrom: "2026-07-01",
      validUntil: "",
    });
    expect(result.countryCode).toBe("CM");
    expect(result.value).toBe(0.82);
    expect(result.validUntil).toBeNull();
    expect(result.validFrom).toBeInstanceOf(Date);
  });

  it("zoneIndexCreateSchema refuse validUntil ≤ validFrom", () => {
    const result = zoneIndexCreateSchema.safeParse({
      family: "pricing",
      countryCode: "UEMOA",
      key: "plan.cockpit.monthly",
      value: "8000",
      source: "décision opérateur",
      validFrom: "2026-07-01",
      validUntil: "2026-07-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("parsePage", () => {
  it("borne à 1, ignore le bruit", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });
});
