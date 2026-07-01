import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";

/**
 * Conservative normalization for intake -> ensures array-typed fields are arrays
 * and wraps single objects/strings into arrays when the schema expects arrays.
 * This mirrors the logic used by scripts/fix-pillars.ts but is synchronous
 * and safe to run on ingestion paths.
 */

function expectsArray(fieldSchema: any): boolean {
  if (!fieldSchema || !fieldSchema._def) return false;
  const def = fieldSchema._def;
  const tryNames = [def.typeName, def?.innerType?._def?.typeName, def?.type?._def?.typeName, def?.items?._def?.typeName];
  for (const n of tryNames) {
    if (typeof n === "string" && n.toLowerCase().includes("array")) return true;
  }
  try {
    const s = String(fieldSchema);
    if (s.toLowerCase().includes("zodarray")) return true;
  } catch {}
  return false;
}

function getArrayItemTypeName(fieldSchema: any): string | null {
  if (!fieldSchema || !fieldSchema._def) return null;
  const def = fieldSchema._def;
  const item = def.type ?? def._def?.type ?? def.innerType ?? def._def?.innerType;
  const name = item?._def?.typeName ?? item?.typeName ?? null;
  return name ?? null;
}

function coerceElementForArray(fieldName: string, fieldSchema: any, value: unknown): unknown {
  const itemType = getArrayItemTypeName(fieldSchema);
  if (itemType && String(itemType).toLowerCase().includes("object")) {
    if (typeof value === "object" && value !== null) return value;
    return { customName: String(value) };
  }
  if (itemType && String(itemType).toLowerCase().includes("string")) {
    return String(value);
  }
  if (itemType && String(itemType).toLowerCase().includes("number")) {
    const n = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isNaN(n) ? value : n;
  }
  if (fieldName.toLowerCase().includes("valeur")) return { customName: String(value) };
  return value;
}

function unwrapSchema(s: any): any {
  if (!s || !s._def) return s;
  const def = s._def;
  const candidates = [def.type, def._def?.type, def.innerType, def._def?.innerType, def._def?.schema, def.items];
  for (const c of candidates) {
    if (c && c._def) return c;
  }
  return s;
}

function normalizeBySchema(schema: any, content: Record<string, unknown>): Record<string, unknown> {
  if (!schema || !schema.shape) return content;
  const shape = schema.shape as Record<string, any>;
  const result: Record<string, unknown> = { ...(content ?? {}) };

  for (const [field, fieldSchemaRaw] of Object.entries(shape)) {
    try {
      const fieldSchema = unwrapSchema(fieldSchemaRaw);

      // Arrays: ensure arrays
      if (expectsArray(fieldSchemaRaw)) {
        const current = result[field];
        if (current === undefined || current === null) {
          // leave undefined vs empty array: choose empty array to avoid client iteration errors
          result[field] = [];
          continue;
        }
        if (Array.isArray(current)) {
          result[field] = current.map((el) => coerceElementForArray(field, fieldSchemaRaw, el));
          continue;
        }

        // Not an array: coerce
        if (typeof current === "string") {
          const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
          if (parts.length > 1) {
            result[field] = parts.map((p) => coerceElementForArray(field, fieldSchemaRaw, p));
          } else {
            result[field] = [coerceElementForArray(field, fieldSchemaRaw, current)];
          }
          continue;
        }
        if (typeof current === "object") {
          result[field] = [current];
          continue;
        }
        result[field] = [current];
        continue;
      }

      // Objects: recurse
      const def = fieldSchemaRaw?._def;
      const typeName = def?.typeName ?? "";
      if (typeName && typeName.toLowerCase().includes("object")) {
        const cur = result[field];
        if (cur === undefined || cur === null) {
          result[field] = {};
          continue;
        }
        if (typeof cur === "object" && !Array.isArray(cur)) {
          result[field] = normalizeBySchema(fieldSchemaRaw, cur as Record<string, unknown>);
          continue;
        }
        // If it's not an object, wrap it conservatively
        result[field] = { value: cur } as Record<string, unknown>;
        continue;
      }
    } catch (err) {
      // non-fatal: skip normalization for this field
      continue;
    }
  }

  return result;
}

export function normalizePillarForIntake(
  pillarKey: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  try {
    const schemaKey = (pillarKey ?? "").toUpperCase();
    const schema = (PILLAR_SCHEMAS as any)[schemaKey];
    if (!schema) return content;
    const normalized = normalizeBySchema(schema, content ?? {});
    return normalized;
  } catch (err) {
    return content;
  }
}

export default normalizePillarForIntake;
