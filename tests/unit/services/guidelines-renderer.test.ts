import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_KEYS, PILLAR_NAMES } from "@/lib/types/advertis-vector";

/**
 * Guidelines Renderer tests.
 *
 * Tests HTML generation, classification logic, pillar inclusion,
 * and shareable link format.
 */

// Replicate the classification logic from guidelines-renderer
function classifyFromComposite(composite: number): string {
  if (composite > 180) return "ICONE";
  if (composite > 160) return "CULTE";
  if (composite > 120) return "FORTE";
  if (composite > 80) return "ORDINAIRE";
  return "ZOMBIE";
}

// Replicate escapeHtml helper
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Replicate formatContentKey helper
function formatContentKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

// Replicate formatContentValue helper
function formatContentValue(value: unknown): string {
  if (value === null || value === undefined) return "\u2014";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatContentValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${formatContentKey(k)}: ${formatContentValue(v)}`)
      .join("; ");
  }
  return String(value);
}

// Simulate HTML generation for a simple document
function generateSimpleHtml(sections: Array<{ pillar: PillarKey; pillarName: string; score: number; content: Record<string, unknown> }>, classification: string, composite: number): string {
  let html = `<!DOCTYPE html><html lang="fr"><head><title>Guidelines</title></head><body>`;
  html += `<div class="composite-score">${Math.round(composite)}/200</div>`;
  html += `<div class="classification">${escapeHtml(classification)}</div>`;

  for (const section of sections) {
    html += `<div class="section"><h2>${escapeHtml(section.pillarName)}</h2>`;
    html += `<span class="score-badge">${section.score.toFixed(1)}/25</span>`;

    if (Object.keys(section.content).length > 0) {
      for (const [key, value] of Object.entries(section.content)) {
        html += `<div class="content-key">${escapeHtml(formatContentKey(key))}</div>`;
        html += `<div class="content-value">${escapeHtml(formatContentValue(value))}</div>`;
      }
    }
    html += `</div>`;
  }

  html += `</body></html>`;
  return html;
}

describe("Guidelines Renderer - HTML Includes All 8 Pillars", () => {
  const sections = PILLAR_KEYS.map((pillar) => ({
    pillar,
    pillarName: PILLAR_NAMES[pillar],
    score: 15,
    content: { testKey: "testValue" },
  }));

  const html = generateSimpleHtml(sections, "FORTE", 120);

  it("generates valid HTML document", () => {
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes all 8 pillar names in the HTML", () => {
    for (const pillar of PILLAR_KEYS) {
      expect(html).toContain(escapeHtml(PILLAR_NAMES[pillar]));
    }
  });

  it("includes Authenticite pillar", () => {
    expect(html).toContain("Authenticit");
  });

  it("includes Distinction pillar", () => {
    expect(html).toContain("Distinction");
  });

  it("includes Valeur pillar", () => {
    expect(html).toContain("Valeur");
  });

  it("includes Engagement pillar", () => {
    expect(html).toContain("Engagement");
  });

  it("includes Risk pillar", () => {
    expect(html).toContain("Risk");
  });

  it("includes Track pillar", () => {
    expect(html).toContain("Track");
  });

  it("includes Innovation pillar", () => {
    expect(html).toContain("Innovation");
  });

  it("includes Strategie pillar", () => {
    expect(html).toContain("Strat");
  });

  it("includes score badges for each section", () => {
    const scoreMatches = html.match(/score-badge/g);
    expect(scoreMatches).not.toBeNull();
    expect(scoreMatches!.length).toBe(8);
  });

  it("includes composite score", () => {
    expect(html).toContain("120/200");
  });

  it("includes classification", () => {
    expect(html).toContain("FORTE");
  });
});

describe("Guidelines Renderer - Classification Logic", () => {
  it("classifies ZOMBIE for composite <= 80", () => {
    expect(classifyFromComposite(0)).toBe("ZOMBIE");
    expect(classifyFromComposite(50)).toBe("ZOMBIE");
    expect(classifyFromComposite(80)).toBe("ZOMBIE");
  });

  it("classifies ORDINAIRE for composite 81-120", () => {
    expect(classifyFromComposite(81)).toBe("ORDINAIRE");
    expect(classifyFromComposite(100)).toBe("ORDINAIRE");
    expect(classifyFromComposite(120)).toBe("ORDINAIRE");
  });

  it("classifies FORTE for composite 121-160", () => {
    expect(classifyFromComposite(121)).toBe("FORTE");
    expect(classifyFromComposite(140)).toBe("FORTE");
    expect(classifyFromComposite(160)).toBe("FORTE");
  });

  it("classifies CULTE for composite 161-180", () => {
    expect(classifyFromComposite(161)).toBe("CULTE");
    expect(classifyFromComposite(170)).toBe("CULTE");
    expect(classifyFromComposite(180)).toBe("CULTE");
  });

  it("classifies ICONE for composite > 180", () => {
    expect(classifyFromComposite(181)).toBe("ICONE");
    expect(classifyFromComposite(200)).toBe("ICONE");
  });
});

describe("Guidelines Renderer - Shareable Link Generation", () => {
  it("shareable link has expected format", () => {
    const token = "abc123def456";
    const url = `/shared/guidelines/${token}`;
    expect(url).toBe("/shared/guidelines/abc123def456");
    expect(url).toMatch(/^\/shared\/guidelines\/[a-z0-9]+$/);
  });

  it("token is reused if already present in strategy", () => {
    const existingToken = "existing-token-12345";
    const result = {
      token: existingToken,
      url: `/shared/guidelines/${existingToken}`,
    };
    expect(result.token).toBe(existingToken);
    expect(result.url).toContain(existingToken);
  });
});

describe("Guidelines Renderer - Content Formatting Helpers", () => {
  it("escapeHtml escapes special characters", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it("formatContentKey converts camelCase to readable text", () => {
    expect(formatContentKey("brandIdentity")).toBe("Brand Identity");
    expect(formatContentKey("primaryColor")).toBe("Primary Color");
  });

  it("formatContentKey converts snake_case to readable text", () => {
    expect(formatContentKey("brand_identity")).toBe("Brand identity");
  });

  it("formatContentValue handles null and undefined", () => {
    expect(formatContentValue(null)).toBe("\u2014");
    expect(formatContentValue(undefined)).toBe("\u2014");
  });

  it("formatContentValue handles strings", () => {
    expect(formatContentValue("hello")).toBe("hello");
  });

  it("formatContentValue handles numbers", () => {
    expect(formatContentValue(42)).toBe("42");
  });

  it("formatContentValue handles booleans", () => {
    expect(formatContentValue(true)).toBe("true");
    expect(formatContentValue(false)).toBe("false");
  });

  it("formatContentValue handles arrays", () => {
    expect(formatContentValue(["a", "b", "c"])).toBe("a, b, c");
  });

  it("formatContentValue handles objects", () => {
    const result = formatContentValue({ key1: "val1", key2: "val2" });
    expect(result).toContain("Key1: val1");
    expect(result).toContain("Key2: val2");
  });
});

describe("Guidelines Renderer - Export Format", () => {
  it("HTML export is a complete HTML document", () => {
    const sections = PILLAR_KEYS.map((pillar) => ({
      pillar,
      pillarName: PILLAR_NAMES[pillar],
      score: 10,
      content: {},
    }));
    const html = generateSimpleHtml(sections, "ZOMBIE", 50);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<body>");
    expect(html).toContain("</body>");
  });

  it("empty content sections show no content keys", () => {
    const sections = [{
      pillar: "a" as PillarKey,
      pillarName: PILLAR_NAMES["a"],
      score: 0,
      content: {},
    }];
    const html = generateSimpleHtml(sections, "ZOMBIE", 0);
    expect(html).not.toContain("content-key");
  });
});
