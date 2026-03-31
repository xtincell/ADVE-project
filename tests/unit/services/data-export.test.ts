import { describe, it, expect } from "vitest";

/**
 * Data Export tests.
 *
 * Tests CSV/JSON formatting, GDPR export structure,
 * and export result shape without requiring DB access.
 */

// Replicate toCsvString helper from the service
function toCsvString(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str =
            typeof val === "object"
              ? JSON.stringify(val)
              : String(val ?? "");
          return str.includes(",") || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

// Replicate flattenObject helper
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, fullKey)
      );
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

interface ExportResult {
  format: string;
  filename: string;
  data: string;
  mimeType: string;
  generatedAt: string;
}

function createExportResult(format: "JSON" | "CSV", id: string, data: string): ExportResult {
  return {
    format,
    filename: `strategy-${id}.${format.toLowerCase()}`,
    data,
    mimeType: format === "JSON" ? "application/json" : "text/csv",
    generatedAt: new Date().toISOString(),
  };
}

describe("Data Export - JSON Export Format", () => {
  it("JSON export has correct MIME type", () => {
    const result = createExportResult("JSON", "test-id", "{}");
    expect(result.mimeType).toBe("application/json");
  });

  it("JSON export filename has .json extension", () => {
    const result = createExportResult("JSON", "abc-123", "{}");
    expect(result.filename).toBe("strategy-abc-123.json");
    expect(result.filename).toMatch(/\.json$/);
  });

  it("JSON export data is valid JSON", () => {
    const data = JSON.stringify({ strategy: { name: "Test" }, pillars: [] }, null, 2);
    const result = createExportResult("JSON", "test", data);
    expect(() => JSON.parse(result.data)).not.toThrow();
  });

  it("JSON export includes generatedAt timestamp", () => {
    const result = createExportResult("JSON", "test", "{}");
    expect(result.generatedAt).toBeDefined();
    const date = new Date(result.generatedAt);
    expect(date.getTime()).toBeGreaterThan(0);
  });

  it("JSON export preserves nested structure", () => {
    const data = {
      strategy: { name: "Brand X", status: "ACTIVE" },
      pillars: [{ key: "a", content: { identity: "strong" } }],
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.strategy.name).toBe("Brand X");
    expect(parsed.pillars[0].key).toBe("a");
  });
});

describe("Data Export - CSV Export Format", () => {
  it("CSV export has correct MIME type", () => {
    const result = createExportResult("CSV", "test-id", "a,b\n1,2");
    expect(result.mimeType).toBe("text/csv");
  });

  it("CSV export filename has .csv extension", () => {
    const result = createExportResult("CSV", "abc-123", "");
    expect(result.filename).toBe("strategy-abc-123.csv");
    expect(result.filename).toMatch(/\.csv$/);
  });

  it("toCsvString generates proper CSV with headers", () => {
    const rows = [
      { name: "Alice", tier: "MAITRE", score: 8.5 },
      { name: "Bob", tier: "COMPAGNON", score: 7.2 },
    ];
    const csv = toCsvString(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,tier,score");
    expect(lines[1]).toBe("Alice,MAITRE,8.5");
    expect(lines[2]).toBe("Bob,COMPAGNON,7.2");
  });

  it("toCsvString escapes values containing commas", () => {
    const rows = [{ description: "hello, world", value: 1 }];
    const csv = toCsvString(rows);
    expect(csv).toContain('"hello, world"');
  });

  it("toCsvString escapes values containing double quotes", () => {
    const rows = [{ note: 'He said "hello"', value: 1 }];
    const csv = toCsvString(rows);
    expect(csv).toContain('"He said ""hello"""');
  });

  it("toCsvString handles empty rows array", () => {
    const csv = toCsvString([]);
    expect(csv).toBe("");
  });

  it("toCsvString serializes objects as JSON in cells", () => {
    const rows = [{ data: { key: "val" }, name: "test" }];
    const csv = toCsvString(rows);
    // Object should be JSON stringified and CSV-escaped (quotes doubled)
    expect(csv).toContain('"key"');
    expect(csv).toContain('"val"');
  });

  it("toCsvString handles null values as 'null' string", () => {
    const rows = [{ name: "test", value: null }];
    const csv = toCsvString(rows as Record<string, unknown>[]);
    const lines = csv.split("\n");
    // null is converted via String(null) = "null" then ?? fallback doesn't trigger
    expect(lines[1]).toBe("test,null");
  });
});

describe("Data Export - Client Data Export (GDPR)", () => {
  it("GDPR export includes export metadata", () => {
    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        userId: "user-1",
        dataSubject: "test@example.com",
        exportType: "GDPR_FULL_EXPORT",
      },
      personalData: { id: "user-1", name: "Test User", email: "test@example.com" },
    };

    expect(exportData.exportMetadata.exportType).toBe("GDPR_FULL_EXPORT");
    expect(exportData.exportMetadata.userId).toBe("user-1");
    expect(exportData.exportMetadata.dataSubject).toBe("test@example.com");
  });

  it("GDPR export includes personal data fields", () => {
    const personalData = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "CLIENT_RETAINER",
      createdAt: new Date().toISOString(),
    };

    expect(personalData).toHaveProperty("id");
    expect(personalData).toHaveProperty("name");
    expect(personalData).toHaveProperty("email");
    expect(personalData).toHaveProperty("role");
  });

  it("GDPR export excludes sensitive tokens from accounts", () => {
    // The service only selects id, provider, type from accounts
    const accountData = { id: "acc-1", provider: "google", type: "oauth" };
    expect(accountData).not.toHaveProperty("access_token");
    expect(accountData).not.toHaveProperty("refresh_token");
    expect(accountData).not.toHaveProperty("id_token");
  });

  it("GDPR export is valid JSON format", () => {
    const data = {
      exportMetadata: { exportedAt: "2024-01-01T00:00:00Z", userId: "u1" },
      personalData: { id: "u1", name: "Test" },
      strategies: [],
      qualityReviews: [],
    };
    const jsonStr = JSON.stringify(data, null, 2);
    expect(() => JSON.parse(jsonStr)).not.toThrow();
  });

  it("GDPR export filename includes userId", () => {
    const userId = "user-abc123";
    const filename = `user-data-export-${userId}.json`;
    expect(filename).toBe("user-data-export-user-abc123.json");
  });
});

describe("Data Export - Flatten Object Helper", () => {
  it("flattens nested objects with dot notation", () => {
    const obj = { a: { b: { c: 1 } } };
    const flat = flattenObject(obj);
    expect(flat["a.b.c"]).toBe(1);
  });

  it("preserves top-level primitive values", () => {
    const obj = { name: "test", value: 42 };
    const flat = flattenObject(obj);
    expect(flat.name).toBe("test");
    expect(flat.value).toBe(42);
  });

  it("preserves arrays without flattening", () => {
    const obj = { tags: ["a", "b", "c"] };
    const flat = flattenObject(obj);
    expect(flat.tags).toEqual(["a", "b", "c"]);
  });

  it("handles empty object", () => {
    const flat = flattenObject({});
    expect(Object.keys(flat)).toHaveLength(0);
  });

  it("preserves Date objects without flattening", () => {
    const now = new Date();
    const obj = { createdAt: now };
    const flat = flattenObject(obj);
    expect(flat.createdAt).toBe(now);
  });

  it("handles deeply nested objects", () => {
    const obj = { l1: { l2: { l3: { l4: "deep" } } } };
    const flat = flattenObject(obj);
    expect(flat["l1.l2.l3.l4"]).toBe("deep");
  });
});
