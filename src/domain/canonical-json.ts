/**
 * JSON canonique RFC 8785 : clés triées par unités UTF-16, nombres ECMAScript,
 * aucun espace. Une seule sérialisation pour les empreintes de domaine : le reçu
 * DataCollector (DC3) et le bilan de campagne La Barre (LB4). Layer 0, sans IO.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) throw new TypeError("Nombre non fini : aucune forme JSON.");
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
    }
    default:
      throw new TypeError(`Valeur sans forme JSON : ${typeof value}.`);
  }
}
