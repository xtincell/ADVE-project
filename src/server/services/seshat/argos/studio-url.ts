/**
 * SHK-0002 — adresse de la bibliothèque canonique Argos-studio, une seule règle
 * pour l'écriture (projection `POST /api/v1/ingest/dossier`) et la lecture
 * publique (`GET /api/v1/references`). HTTPS public, sans identifiants,
 * paramètres ni fragment ; résolution DNS contrôlée par la garde SSRF partagée.
 */
import { assertPublicUrl } from "@/lib/net/ssrf-guard";

export class StudioUrlShapeError extends Error {}

/** Contrôle de forme, synchrone et sans réseau. Lève `StudioUrlShapeError`. */
export function studioBaseShape(baseUrl: string): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new StudioUrlShapeError("Endpoint Argos HTTPS public requis, sans paramètres ni identifiants.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new StudioUrlShapeError("Endpoint Argos HTTPS public requis, sans paramètres ni identifiants.");
  }
  return new URL(url.toString().replace(/\/?$/, "/"));
}

/** Forme + hôte public (DNS résolu hors réseau privé). */
export async function studioBase(baseUrl: string): Promise<URL> {
  const base = studioBaseShape(baseUrl);
  await assertPublicUrl(base.toString());
  return base;
}

export async function studioEndpoint(baseUrl: string): Promise<URL> {
  return new URL("api/v1/ingest/dossier", await studioBase(baseUrl));
}
