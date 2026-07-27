export const dynamic = "force-dynamic";
/**
 * Recherche d'une occurrence dans le contenu des marques (opérateur, CRON_SECRET).
 *
 * LECTURE SEULE. Répond à une question qu'aucune surface ne sait poser :
 * « où, dans toutes les marques, cette chaîne apparaît-elle ? »
 *
 * Le besoin est né d'un cas réel : une personne nommée dans le contenu ADVE
 * d'une marque à laquelle elle n'appartient pas. Les champs porteurs de
 * personnes (`a.equipeDirigeante`, `a.messieFondateur`, `a.storyFondateur`…)
 * sont remplis par inférence — un nom peut donc s'y retrouver sans que
 * personne ne l'ait décidé, et il n'existait aucun moyen de le CONSTATER :
 * l'inventaire des comptes ne voit que les comptes, et le cockpit ne montre
 * qu'une marque à la fois.
 *
 * On ne corrige pas ce qu'on n'a pas lu. Cette route lit ; la correction passe
 * par la voie gouvernée `OPERATOR_AMEND_PILLAR` (chokepoint `writePillar`),
 * jamais par ici.
 *
 *   GET /api/admin/brand-scan?q=Hilaire[&strategyId=…]
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * Rend, pour chaque occurrence : la marque, le pilier, le CHEMIN JSON exact et
 * un extrait. Le chemin est ce qui rend la correction possible sans deviner.
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";

/**
 * Comparaison insensible à la casse ET aux accents (« Hilaire » ≡ « hilairé »).
 * Plage `\u0300-\u036f` écrite en échappements : les marques combinantes en
 * littéral survivent mal aux copies de fichier et échoueraient en silence —
 * une recherche qui ne trouve rien ressemble à « il n'y a rien ».
 */
function fold(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Hit = { path: string; excerpt: string };

/**
 * Parcourt une valeur JSON et rend le chemin de chaque chaîne qui contient
 * l'aiguille. Les tableaux sont indexés (`equipeDirigeante[2].nom`) — sans
 * l'index, on saurait qu'il y a un intrus sans savoir lequel retirer.
 */
function walk(value: unknown, needle: string, path: string, out: Hit[], depth = 0): void {
  if (depth > 12 || out.length >= 200) return; // borne dure : pas de récursion sans fond
  if (typeof value === "string") {
    if (fold(value).includes(needle)) {
      const i = fold(value).indexOf(needle);
      out.push({
        path,
        excerpt: value.slice(Math.max(0, i - 60), i + needle.length + 60).trim(),
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, needle, `${path}[${i}]`, out, depth + 1));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walk(v, needle, path ? `${path}.${k}` : k, out, depth + 1);
    }
  }
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const q = params.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Passer ?q=<chaîne d'au moins 2 caractères>" }, { status: 400 });
  }
  const needle = fold(q.trim());
  const strategyId = params.get("strategyId");

  const pillars = await db.pillar.findMany({
    where: strategyId ? { strategyId } : {},
    select: {
      pillarKey: true,
      content: true,
      strategy: { select: { id: true, name: true, publicSlug: true } },
    },
  });

  const findings: Array<{
    strategyId: string;
    brand: string;
    slug: string | null;
    pillarKey: string;
    hits: Hit[];
  }> = [];

  for (const p of pillars) {
    const hits: Hit[] = [];
    walk(p.content, needle, "", hits, 0);
    if (hits.length > 0) {
      findings.push({
        strategyId: p.strategy.id,
        brand: p.strategy.name,
        slug: p.strategy.publicSlug,
        pillarKey: p.pillarKey,
        hits,
      });
    }
  }

  // Les rattachements de comptes portent aussi des personnes : un nom peut
  // n'être nulle part dans le contenu et pourtant lier quelqu'un à la marque.
  const accountLinks = await db.strategyCollaborator.findMany({
    where: {
      OR: [
        { user: { name: { contains: q.trim(), mode: "insensitive" } } },
        { user: { email: { contains: q.trim(), mode: "insensitive" } } },
      ],
      ...(strategyId ? { strategyId } : {}),
    },
    select: {
      status: true,
      role: true,
      user: { select: { email: true, name: true } },
      strategy: { select: { id: true, name: true } },
    },
  });

  const owned = await db.strategy.findMany({
    where: {
      OR: [
        { user: { name: { contains: q.trim(), mode: "insensitive" } } },
        { user: { email: { contains: q.trim(), mode: "insensitive" } } },
      ],
      ...(strategyId ? { id: strategyId } : {}),
    },
    select: { id: true, name: true, user: { select: { email: true } } },
  });

  return NextResponse.json({
    ok: true,
    query: q,
    pillarsScanned: pillars.length,
    contentFindings: findings,
    accountLinks: accountLinks.map((c) => ({
      brand: c.strategy.name,
      strategyId: c.strategy.id,
      email: c.user.email,
      name: c.user.name,
      teamRole: c.role,
      status: c.status,
    })),
    owns: owned.map((s) => ({ brand: s.name, strategyId: s.id, owner: s.user?.email ?? null })),
    at: new Date().toISOString(),
  });
}
