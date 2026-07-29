export const dynamic = "force-dynamic";
/**
 * Diagnostic de l'étage embeddings — serveur-à-serveur (`CRON_SECRET`).
 *
 * Pourquoi cette route existe : **rien, dans le produit, ne permettait de savoir
 * si les embeddings fonctionnent.** La seule façon de l'apprendre était de lire
 * les journaux du conteneur, en espérant qu'un appel soit passé au bon moment.
 * Conséquence vécue le 2026-07-29 : un `EMBED_SERVICE_URL` qui pointait sur un
 * nom d'hôte injoignable est resté invisible pendant des jours, puis a coûté
 * plusieurs redémarrages de production à diagnostiquer **à l'aveugle** — en
 * changeant une variable, en redémarrant, en relisant les journaux, en
 * recommençant. Une question d'exploitation doit se poser en une requête.
 *
 *   GET /api/admin/embed-check
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * La route **tente un vrai embedding** sur une chaîne minuscule et rapporte ce
 * qui revient : fournisseur retenu, modèle, dimension, durée — ou le message
 * d'erreur exact. Elle expose l'**hôte** de l'endpoint (c'est ce qu'on
 * diagnostique) et **jamais** une clé : seule leur présence et leur longueur
 * sont rapportées.
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { embed } from "@/server/services/llm-gateway";

/** Hôte seul — une URL d'endpoint peut porter un jeton en query. */
function hostOf(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return "(valeur non parsable comme URL)";
  }
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = {
    EMBED_SERVICE_URL: hostOf(process.env.EMBED_SERVICE_URL),
    EMBED_MODEL_NAME: process.env.EMBED_MODEL_NAME ?? null,
    EMBED_API_KEY: process.env.EMBED_API_KEY ? "posée" : "absente",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "posée" : "absente",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "posée" : "absente",
  };

  // Sonde de joignabilité brute, AVANT le Gateway : elle distingue « le nom
  // d'hôte ne résout pas / le port est fermé » (panne d'infrastructure) de
  // « l'endpoint répond mais refuse » (panne de configuration ou de quota).
  let reachability: Record<string, unknown> = { tested: false };
  const base = process.env.EMBED_SERVICE_URL?.replace(/\/v1$/, "").replace(/\/$/, "");
  if (base) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      reachability = { tested: true, ok: res.ok, status: res.status, ms: Date.now() - t0 };
    } catch (err) {
      reachability = {
        tested: true,
        ok: false,
        ms: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Le vrai chemin, celui que le produit emprunte.
  const t1 = Date.now();
  let result: Record<string, unknown>;
  try {
    const r = await embed({ input: "diagnostic", caller: "admin:embed-check" });
    const vec = r.embeddings[0] ?? [];
    result = {
      ok: vec.length > 0,
      provider: r.provider,
      model: r.model,
      dim: vec.length,
      ms: Date.now() - t1,
      // `provider: "none"` + dimension 0 = dégradation honnête (ADR-0108),
      // pas une panne : le produit tourne, en repli déterministe.
      interpretation:
        vec.length > 0
          ? "Embeddings opérationnels — la recherche sémantique est active."
          : "Aucun embedding obtenable — repli déterministe (recouvrement de termes).",
    };
  } catch (err) {
    result = {
      ok: false,
      ms: Date.now() - t1,
      error: err instanceof Error ? err.message : String(err),
      interpretation:
        "Le Gateway a levé au lieu de dégrader — c'est un défaut, pas une panne d'infra.",
    };
  }

  return NextResponse.json({ ok: true, config, reachability, embed: result });
}
