import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma client before importing the templates module.
vi.mock("@/lib/db", () => {
  return {
    db: {
      notificationTemplate: {
        findUnique: vi.fn(),
      },
    },
  };
});

import { db } from "@/lib/db";
import { renderTemplate, TemplateNotFoundError } from "@/server/services/anubis/templates";

describe("Anubis template engine (ADR-0024)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws TemplateNotFoundError when slug is unknown", async () => {
    (db.notificationTemplate.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    await expect(renderTemplate("missing", {})).rejects.toBeInstanceOf(TemplateNotFoundError);
  });

  it("renders Handlebars vars in subject and bodyHbs", async () => {
    (db.notificationTemplate.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "t1",
      slug: "welcome",
      channel: "EMAIL",
      subject: "Bienvenue {{user.name}}",
      bodyHbs: "Salut {{user.name}}, ton score est {{score}}.",
      bodyMjml: null,
      variables: {},
      category: "transactional",
    });
    const out = await renderTemplate("welcome", { user: { name: "Ada" }, score: 42 });
    expect(out.subject).toBe("Bienvenue Ada");
    expect(out.text).toBe("Salut Ada, ton score est 42.");
    expect(out.html).toBeUndefined();
  });

  it("escapes HTML in bodyMjml interpolation but not in bodyHbs", async () => {
    (db.notificationTemplate.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "t2",
      slug: "alert",
      channel: "EMAIL",
      subject: null,
      bodyHbs: "Lien: {{link}}",
      bodyMjml: "<p>Lien: {{link}}</p>",
      variables: {},
      category: "notification",
    });
    const out = await renderTemplate("alert", { link: "<script>x</script>" });
    expect(out.text).toContain("<script>x</script>");
    // bodyMjml may not be compiled if mjml lib is unavailable in test env;
    // either way, the dangerous content should be escaped before MJML.
    expect(out.html).toBeDefined();
    expect(out.html).not.toContain("<script>x</script>");
  });
});
