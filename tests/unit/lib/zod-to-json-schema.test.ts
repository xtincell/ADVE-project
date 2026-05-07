/**
 * Phase 21 (ADR-0067) — Unit tests for `deriveJsonSchemaFromZod`
 *
 * Le helper doit gérer les types Zod usuels qu'on rencontre dans
 * pillar-schemas, glory tools, frameworks, brand-asset payloads.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { deriveJsonSchemaFromZod, jsonSchemaToPromptBlock } from "@/server/services/utils/zod-to-json-schema";

describe("deriveJsonSchemaFromZod", () => {
  it("converts ZodString with min/max", () => {
    const schema = z.string().min(3).max(20);
    const out = deriveJsonSchemaFromZod(schema);
    expect((out as { type: string }).type).toBe("string");
  });

  it("converts ZodNumber with int constraint", () => {
    const schema = z.number().int().min(0).max(100);
    const out = deriveJsonSchemaFromZod(schema);
    const t = (out as { type: string }).type;
    // zod 4 native may emit "integer" or "number" — both acceptable.
    expect(["integer", "number"]).toContain(t);
  });

  it("converts ZodBoolean", () => {
    const out = deriveJsonSchemaFromZod(z.boolean());
    expect((out as { type: string }).type).toBe("boolean");
  });

  it("converts ZodObject with required and optional fields", () => {
    const schema = z.object({
      a: z.string(),
      b: z.string().optional(),
      c: z.number(),
    });
    const out = deriveJsonSchemaFromZod(schema) as {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
    expect(out.type).toBe("object");
    expect(Object.keys(out.properties)).toContain("a");
    expect(Object.keys(out.properties)).toContain("b");
    expect(Object.keys(out.properties)).toContain("c");
    // required must contain a + c, but not b
    expect(out.required).toContain("a");
    expect(out.required).toContain("c");
    expect(out.required).not.toContain("b");
  });

  it("converts ZodArray with element schema", () => {
    const schema = z.array(z.string());
    const out = deriveJsonSchemaFromZod(schema) as { type: string; items: { type: string } };
    expect(out.type).toBe("array");
    expect(out.items.type).toBe("string");
  });

  it("converts ZodEnum to string with enum constraint", () => {
    const schema = z.enum(["a", "b", "c"]);
    const out = deriveJsonSchemaFromZod(schema) as { type?: string; enum?: string[] };
    // zod 4 native can produce { enum: [...] } directly without `type`.
    expect(out.enum).toBeDefined();
    expect(out.enum).toEqual(expect.arrayContaining(["a", "b", "c"]));
  });

  it("converts ZodUnion to oneOf", () => {
    const schema = z.union([z.string(), z.number()]);
    const out = deriveJsonSchemaFromZod(schema) as { oneOf?: unknown[]; anyOf?: unknown[] };
    // zod 4 native may produce anyOf (compatible JSON Schema), our fallback uses oneOf.
    expect(out.oneOf ?? out.anyOf).toBeDefined();
  });

  it("preserves description from .describe()", () => {
    const schema = z.string().describe("le slug de la marque");
    const out = deriveJsonSchemaFromZod(schema) as { description?: string };
    expect(out.description).toContain("slug");
  });

  it("supports nested objects with arrays of objects (pillar-like)", () => {
    const schema = z.object({
      personas: z.array(
        z.object({
          name: z.string(),
          age: z.number().int().optional(),
        }),
      ),
    });
    const out = deriveJsonSchemaFromZod(schema) as {
      properties: { personas: { type: string; items: { properties: Record<string, unknown> } } };
    };
    expect(out.properties.personas.type).toBe("array");
    expect(Object.keys(out.properties.personas.items.properties)).toContain("name");
  });

  it("jsonSchemaToPromptBlock produces stable formatted output", () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const block = jsonSchemaToPromptBlock(deriveJsonSchemaFromZod(schema));
    expect(block).toContain('"type"');
    expect(block).toContain("object");
    expect(block.startsWith("{")).toBe(true);
  });

  it("respects optional title via options", () => {
    const schema = z.object({ x: z.string() });
    const out = deriveJsonSchemaFromZod(schema, { title: "MyShape" }) as { title?: string };
    expect(out.title).toBe("MyShape");
  });
});
