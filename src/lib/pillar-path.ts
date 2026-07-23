/**
 * PILLAR-PATH — Résolution de chemin ADVE profonde, unifiée (feuille, pure).
 *
 * Un dot-path pilier peut viser une feuille arbitrairement profonde, y compris
 * à travers des indices de tableau : `produitsCatalogue[2].gainClientConcret`,
 * `personas[0].jobsToBeDone`, `gamification.niveaux[1].recompense`.
 *
 * Ce module est la SEULE mécanique de chemin du repo. Avant lui, trois copies
 * divergeaient :
 *   - le gateway (`pillar-gateway`) savait ÉCRIRE en profondeur (array-index) ;
 *   - l'assessor (`pillar-maturity/assessor`) LISAIT en `split(".")` object-only ;
 *   - l'auto-filler (`pillar-maturity/auto-filler`) ÉCRIVAIT en `split(".")` object-only.
 * Résultat : la notoria ne pouvait ni détecter ni écrire une cellule de matrice.
 * Les trois consomment désormais ces fonctions (le gateway les re-exporte pour
 * compat des imports historiques `@/server/services/pillar-gateway`).
 *
 * Layer-1 lib : zéro dépendance serveur (feuille madge), importable partout
 * en aval (server/services, server/trpc).
 */

/**
 * Tokenise un dot-path avec indices de tableau : `personas[0].name` →
 * `["personas", 0, "name"]`. Sans ce parsing, `personas[0].name` créait une clé
 * littérale « personas[0] » au lieu d'indexer le tableau (corruption — l'amendement
 * opérateur d'un item de tableau écrivait à côté). ADR-0172/audit ADVE 2026-07-22.
 */
export function tokenizePillarPath(path: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  for (const seg of path.split(".")) {
    const m = seg.match(/^([^[\]]+)((?:\[\d+\])*)$/);
    if (!m || !m[1]) {
      tokens.push(seg);
      continue;
    }
    tokens.push(m[1]);
    for (const idx of (m[2] ?? "").match(/\d+/g) ?? []) tokens.push(Number(idx));
  }
  return tokens;
}

/**
 * Segments de chemin interdits — écrire via `__proto__`/`constructor`/`prototype`
 * remonterait dans `Object.prototype` (empoisonnement de prototype GLOBAL : tous les
 * tenants, tout le process, jusqu'au restart). `pillar.amend` accepte un `field`
 * libre non-allowlisté → vecteur atteignable. On refuse net. Audit adversarial 2026-07-22.
 */
const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

/** Lève si un token de chemin permettrait un empoisonnement de prototype. */
export function assertSafePillarPath(tokens: readonly (string | number)[]): void {
  for (const t of tokens) {
    if (typeof t === "string" && FORBIDDEN_PATH_SEGMENTS.has(t)) {
      throw new Error(
        `Chemin de champ interdit : segment « ${t} » (protection contre l'empoisonnement de prototype).`,
      );
    }
  }
}

/**
 * Écrit `value` à `path` dans `obj`, en créant les conteneurs intermédiaires
 * (tableau si le token suivant est un index, objet sinon). Proto-guardé.
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const tokens = tokenizePillarPath(path);
  assertSafePillarPath(tokens);
  if (tokens.length === 1) {
    (obj as Record<string | number, unknown>)[tokens[0]!] = value;
    return;
  }
  let current: Record<string | number, unknown> = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i]!;
    const nextIsIndex = typeof tokens[i + 1] === "number";
    if (current[t] === undefined || current[t] === null || typeof current[t] !== "object") {
      // Crée un tableau si le prochain token est un index, sinon un objet.
      current[t] = nextIsIndex ? [] : {};
    }
    current = current[t] as Record<string | number, unknown>;
  }
  current[tokens[tokens.length - 1]!] = value;
}

/**
 * Lit la valeur à `path` (lecture profonde, array-index comprise). Contrepartie
 * de `setNestedValue`. Retourne `undefined` si un segment du chemin manque ou
 * traverse un non-objet. Remplace l'ex-`resolvePath` object-only de l'assessor.
 */
export function resolvePillarPath(content: Record<string, unknown>, path: string): unknown {
  let cur: unknown = content;
  for (const tok of tokenizePillarPath(path)) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[tok];
  }
  return cur;
}

/**
 * Récupère (copie de) le tableau à un dot-path, y compris imbriqué dans un élément
 * de tableau (`personas[0].jobsToBeDone`). Symétrique de `setNestedValue` du côté
 * écriture — sans ça, updateArrayItem/removeArrayItem ne pouvaient PAS cibler un
 * tableau imbriqué (capacité morte, audit 2026-07-22). Retourne `[]` si absent ou
 * non-tableau.
 */
export function getNestedArray(content: Record<string, unknown>, path: string): unknown[] {
  const v = resolvePillarPath(content, path);
  return Array.isArray(v) ? [...v] : [];
}
