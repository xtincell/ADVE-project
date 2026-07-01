/**
 * Zod → JSON Schema (Phase 21 — F-A1)
 *
 * Convertit un schéma Zod en JSON Schema 7 sérialisable, dans le but de
 * l'INJECTER dans le system prompt LLM. Pas de "validation côté client" ici —
 * la validation reste à `parseAndValidateLLM` (ADR-0063, mode strict).
 *
 * Pourquoi un helper local plutôt qu'`zod-to-json-schema` (npm) ?
 *   1. Zod 4 expose `z.toJSONSchema()` natif — on l'utilise quand dispo.
 *   2. Fallback minimal mais exhaustif pour les types qu'on rencontre dans
 *      pillar-schemas / glory tools / frameworks (objects + strings + numbers
 *      + arrays + optional + enum + union + literal + record + boolean).
 *   3. Pas de dépendance externe pour un convertisseur de ~150 LOC.
 *
 * Cf. ADR-0067 — "LLM output structured enforcement".
 */
import { z } from "zod";

export type JsonSchema7 =
  | { type: "string"; description?: string; minLength?: number; maxLength?: number; pattern?: string; enum?: string[]; format?: string }
  | { type: "number" | "integer"; description?: string; minimum?: number; maximum?: number; multipleOf?: number }
  | { type: "boolean"; description?: string }
  | { type: "null"; description?: string }
  | { type: "array"; description?: string; items: JsonSchema7; minItems?: number; maxItems?: number }
  | { type: "object"; description?: string; properties: Record<string, JsonSchema7>; required?: string[]; additionalProperties?: boolean | JsonSchema7 }
  | { description?: string; oneOf: JsonSchema7[] }
  | { description?: string; anyOf: JsonSchema7[] }
  | { description?: string; const: string | number | boolean | null }
  | { description?: string; enum: Array<string | number | boolean | null> }
  | { description?: string }; // unknown / any fallback

interface DeriveOptions {
  /** Top-level title (rendu dans `title:` du schéma). */
  title?: string;
  /** Description fallback si le schéma Zod n'a pas de `.describe()`. */
  description?: string;
}

/**
 * Convertit un Zod schema en JSON Schema 7. Privilégie `z.toJSONSchema()`
 * natif (zod 4) si disponible ; fallback custom sinon.
 */
export function deriveJsonSchemaFromZod(
  schema: z.ZodType,
  options: DeriveOptions = {},
): JsonSchema7 & { title?: string } {
  const native = (z as unknown as { toJSONSchema?: (s: z.ZodType, opts?: unknown) => JsonSchema7 }).toJSONSchema;
  if (typeof native === "function") {
    try {
      const result = native(schema, { target: "draft-7" }) as JsonSchema7 & { title?: string };
      if (options.title) result.title = options.title;
      if (options.description && !result.description) result.description = options.description;
      return result;
    } catch {
      // Fall through to custom converter
    }
  }
  const fallback = convertCustom(schema);
  if (options.title) (fallback as { title?: string }).title = options.title;
  if (options.description && !("description" in fallback && fallback.description)) {
    (fallback as { description?: string }).description = options.description;
  }
  return fallback;
}

/**
 * Sérialise un JSON Schema en chaîne lisible pour LLM, formatée pour être
 * injectée dans un system prompt. Évite les retours à la ligne excessifs.
 */
export function jsonSchemaToPromptBlock(schema: JsonSchema7 & { title?: string }): string {
  return JSON.stringify(schema, null, 2);
}

// ── Custom fallback converter ────────────────────────────────────────────

function convertCustom(schema: z.ZodType): JsonSchema7 {
  const description = readDescription(schema);

  if (schema instanceof z.ZodString) return convertString(schema, description);
  if (schema instanceof z.ZodNumber) return convertNumber(schema, description);
  if (schema instanceof z.ZodBigInt) return { type: "integer", description };
  if (schema instanceof z.ZodBoolean) return { type: "boolean", description };
  if (schema instanceof z.ZodNull) return { type: "null", description };
  if (schema instanceof z.ZodLiteral) {
    const value = (schema as z.ZodLiteral<string | number | boolean | null>).value as string | number | boolean | null;
    return { const: value, description };
  }
  if (schema instanceof z.ZodEnum) {
    const values = Object.values((schema as unknown as { enum: Record<string, string> }).enum);
    return { type: "string", enum: values as string[], description };
  }
  if (schema instanceof z.ZodArray) {
    const items = convertCustom((schema as z.ZodArray<z.ZodType>).element);
    return { type: "array", items, description };
  }
  if (schema instanceof z.ZodObject) {
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    const properties: Record<string, JsonSchema7> = {};
    const required: string[] = [];
    for (const [key, fieldSchema] of Object.entries(shape)) {
      properties[key] = convertCustom(fieldSchema as z.ZodType);
      if (!isOptionalLike(fieldSchema as z.ZodType)) required.push(key);
    }
    const out: JsonSchema7 = { type: "object", properties, additionalProperties: false };
    if (required.length > 0) (out as { required?: string[] }).required = required;
    if (description) (out as { description?: string }).description = description;
    return out;
  }
  if (schema instanceof z.ZodOptional) {
    return convertCustom((schema as z.ZodOptional<z.ZodType>).unwrap());
  }
  if (schema instanceof z.ZodNullable) {
    const inner = convertCustom((schema as z.ZodNullable<z.ZodType>).unwrap());
    return { anyOf: [inner, { type: "null" }], description };
  }
  if (schema instanceof z.ZodDefault) {
    return convertCustom((schema as z.ZodDefault<z.ZodType>).removeDefault());
  }
  if (schema instanceof z.ZodUnion) {
    const opts = (schema as z.ZodUnion<readonly [z.ZodType, ...z.ZodType[]]>).options;
    return { oneOf: opts.map(convertCustom), description };
  }
  if (schema instanceof z.ZodIntersection) {
    const inner = schema as unknown as { _def: { left: z.ZodType; right: z.ZodType } };
    return { anyOf: [convertCustom(inner._def.left), convertCustom(inner._def.right)], description };
  }
  if (schema instanceof z.ZodRecord) {
    // Zod 4 — `valueType` lives in `_def`, not exposed as `valueSchema` getter.
    const def = (schema as unknown as { _def: { valueType?: z.ZodType } })._def;
    const valueSchema = def.valueType ? convertCustom(def.valueType) : { description: "any" };
    return { type: "object", properties: {}, additionalProperties: valueSchema, description };
  }
  if (schema instanceof z.ZodTuple) {
    // Zod 4 — `items` lives in `_def.items`, not exposed as direct getter.
    const def = (schema as unknown as { _def: { items?: ReadonlyArray<z.ZodType> } })._def;
    const items = def.items ?? [];
    return {
      type: "array",
      items: { oneOf: items.map(convertCustom) },
      minItems: items.length,
      maxItems: items.length,
      description,
    };
  }
  if (schema instanceof z.ZodLazy) {
    const def = (schema as unknown as { _def: { getter?: () => z.ZodType } })._def;
    if (def.getter) return convertCustom(def.getter());
    return { description: description ?? "lazy" };
  }
  if (schema instanceof z.ZodAny || schema instanceof z.ZodUnknown) {
    return { description: description ?? "any" };
  }
  return { description: description ?? "unknown" };
}

function convertString(schema: z.ZodString, description: string | undefined): JsonSchema7 {
  const out: JsonSchema7 = { type: "string" };
  if (description) (out as { description?: string }).description = description;
  const checks = (schema as unknown as { _def: { checks?: Array<{ kind: string; value?: number; regex?: RegExp }> } })._def.checks ?? [];
  for (const check of checks) {
    if (check.kind === "min" && typeof check.value === "number") (out as { minLength?: number }).minLength = check.value;
    if (check.kind === "max" && typeof check.value === "number") (out as { maxLength?: number }).maxLength = check.value;
    if (check.kind === "regex" && check.regex) (out as { pattern?: string }).pattern = check.regex.source;
    if (check.kind === "email") (out as { format?: string }).format = "email";
    if (check.kind === "uuid") (out as { format?: string }).format = "uuid";
    if (check.kind === "url") (out as { format?: string }).format = "uri";
  }
  return out;
}

function convertNumber(schema: z.ZodNumber, description: string | undefined): JsonSchema7 {
  const out: JsonSchema7 = { type: "number" };
  if (description) (out as { description?: string }).description = description;
  const checks = (schema as unknown as { _def: { checks?: Array<{ kind: string; value?: number }> } })._def.checks ?? [];
  for (const check of checks) {
    if (check.kind === "int") (out as { type: "integer" }).type = "integer";
    if (check.kind === "min" && typeof check.value === "number") (out as { minimum?: number }).minimum = check.value;
    if (check.kind === "max" && typeof check.value === "number") (out as { maximum?: number }).maximum = check.value;
    if (check.kind === "multipleOf" && typeof check.value === "number") (out as { multipleOf?: number }).multipleOf = check.value;
  }
  return out;
}

function readDescription(schema: z.ZodType): string | undefined {
  const def = (schema as unknown as { _def?: { description?: string } })._def;
  return def?.description;
}

function isOptionalLike(schema: z.ZodType): boolean {
  return (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault ||
    (schema instanceof z.ZodNullable && (schema as z.ZodNullable<z.ZodType>).unwrap() instanceof z.ZodOptional)
  );
}
