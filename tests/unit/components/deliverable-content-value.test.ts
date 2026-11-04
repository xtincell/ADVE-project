import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
vi.mock("@/components/cockpit/field-renderers", () => ({ getFieldLabel: (key: string) => key }));
import { DeliverableContentValue } from "@/components/cockpit/deliverable-content-value";
const render = (value: unknown) => renderToStaticMarkup(createElement(DeliverableContentValue, { value }));

describe("complete structured deliverable reading", () => {
  it("retains every item beyond the former five-item limit", () => {
    const values = Array.from({ length: 8 }, (_, i) => `Unique item ${i + 1}`);
    const html = render([{ kpis: values }]);
    for (const text of values) expect(html).toContain(text);
  });
  it("retains every nested field and its full text", () => {
    const text = "A long source value. ".repeat(20);
    const html = render([{ detail: { first: "First", second: "Second", third: "Third", fourth: text } }]);
    expect(html).toContain(text); expect(html).toContain("fourth");
  });
  it("supports mixed lists, zero, false and escaped source text", () => {
    const html = render(["First", { detail: ["<script>alert(1)</script>", 0, false] }]);
    expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>");
    expect(html).toContain(">0</p>"); expect(html).toContain(">Non</p>");
  });
});
