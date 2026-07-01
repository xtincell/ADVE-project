/**
 * Anubis — Deterministic MJML-subset renderer (zero external dependency).
 *
 * Replaces the `mjml` npm package, dropped 2026-06: it dragged in 34 high /
 * 10 moderate transitive vulnerabilities incompatible with the B2B
 * due-diligence posture (Trust Center, DPA), and zero MJML templates were
 * ever seeded in-repo — `bodyMjml` is an optional operator-authored field.
 *
 * This renderer compiles the transactional-email subset operators author in
 * `NotificationTemplate.bodyMjml` into email-client-safe, table-based HTML
 * with inline styles (the only layout primitive that survives Outlook /
 * Gmail / Apple Mail consistently).
 *
 * Supported tags: mjml, mj-head/mj-title/mj-preview, mj-body, mj-section,
 * mj-column, mj-text, mj-button, mj-image, mj-divider, mj-spacer, mj-raw.
 * Unknown tags degrade to their rendered inner content (never throw — an
 * email must always render something).
 *
 * Pure function: no LLM, no I/O, same input → same output (variance 0).
 * Cf. ADR-0025 (Anubis template engine), R7/Stream-5 due-diligence.
 */

export interface MjmlRenderResult {
  html: string;
  /** Plain-text body line for preview/preheader, if an <mj-preview> was set. */
  preview?: string;
}

interface MjmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: MjmlNode[];
  /** Present only for text nodes (tag === "#text"). */
  text?: string;
}

const VOID_TAGS = new Set(["mj-image", "mj-divider", "mj-spacer", "br", "hr", "img"]);

const TOKEN_RE =
  /<\s*(\/?)\s*([a-zA-Z][\w-]*)((?:\s+[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)\s*>/g;

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1]!.toLowerCase()] = (m[2] ?? m[3] ?? "").trim();
  }
  return attrs;
}

/** Lightweight, forgiving XML-ish parser tuned for MJML. */
function parse(source: string): MjmlNode {
  const root: MjmlNode = { tag: "#root", attrs: {}, children: [] };
  const stack: MjmlNode[] = [root];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;

  const pushText = (text: string) => {
    if (!text) return;
    // Collapse pure-whitespace gaps between block tags into nothing, but keep
    // meaningful inline text.
    if (text.trim() === "") return;
    stack[stack.length - 1]!.children.push({ tag: "#text", attrs: {}, children: [], text });
  };

  while ((m = TOKEN_RE.exec(source)) !== null) {
    pushText(source.slice(lastIndex, m.index));
    lastIndex = TOKEN_RE.lastIndex;

    const isClose = m[1] === "/";
    const tag = m[2]!.toLowerCase();
    const attrs = parseAttrs(m[3] ?? "");
    const selfClose = m[4] === "/" || VOID_TAGS.has(tag);

    if (isClose) {
      // Pop until we find the matching open tag (tolerant of mis-nesting).
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i]!.tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const node: MjmlNode = { tag, attrs, children: [] };
    stack[stack.length - 1]!.children.push(node);
    if (!selfClose) stack.push(node);
  }
  pushText(source.slice(lastIndex));
  return root;
}

function styleAttr(parts: Array<[string, string | undefined]>): string {
  const css = parts
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return css ? ` style="${css}"` : "";
}

function px(v: string | undefined, fallback?: string): string | undefined {
  if (v == null || v === "") return fallback;
  return /^\d+$/.test(v) ? `${v}px` : v;
}

// ─── Per-tag renderers ───────────────────────────────────────────────────────

function renderChildren(node: MjmlNode): string {
  return node.children.map(renderNode).join("");
}

function renderText(node: MjmlNode): string {
  const a = node.attrs;
  const style = styleAttr([
    ["color", a["color"] ?? "#1a1a1a"],
    ["font-size", px(a["font-size"], "14px")],
    ["font-family", a["font-family"] ?? "Helvetica,Arial,sans-serif"],
    ["line-height", a["line-height"] ?? "1.5"],
    ["font-weight", a["font-weight"]],
    ["text-align", a["align"] ?? "left"],
    ["padding", px(a["padding"], "8px 0")],
  ]);
  return `<div${style}>${renderChildren(node)}</div>`;
}

function renderButton(node: MjmlNode): string {
  const a = node.attrs;
  const bg = a["background-color"] ?? "#e2231a"; // rouge fusée default
  const color = a["color"] ?? "#ffffff";
  const href = escapeAttr(a["href"] ?? "#");
  const align = a["align"] ?? "center";
  const linkStyle = styleAttr([
    ["display", "inline-block"],
    ["background-color", bg],
    ["color", color],
    ["font-family", a["font-family"] ?? "Helvetica,Arial,sans-serif"],
    ["font-size", px(a["font-size"], "14px")],
    ["font-weight", "600"],
    ["text-decoration", "none"],
    ["border-radius", px(a["border-radius"], "6px")],
    ["padding", px(a["inner-padding"], "12px 24px")],
  ]);
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
    `<tr><td align="${escapeAttr(align)}" style="padding:12px 0">` +
    `<a href="${href}"${linkStyle}>${renderChildren(node)}</a>` +
    `</td></tr></table>`
  );
}

function renderImage(node: MjmlNode): string {
  const a = node.attrs;
  const width = a["width"] ? ` width="${escapeAttr(a["width"].replace("px", ""))}"` : "";
  const align = a["align"] ?? "center";
  const style = styleAttr([
    ["display", "block"],
    ["max-width", "100%"],
    ["height", "auto"],
    ["border", "0"],
    ["border-radius", px(a["border-radius"])],
  ]);
  const img = `<img src="${escapeAttr(a["src"] ?? "")}" alt="${escapeAttr(a["alt"] ?? "")}"${width}${style} />`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${escapeAttr(align)}" style="padding:8px 0">${img}</td></tr></table>`;
}

function renderDivider(node: MjmlNode): string {
  const a = node.attrs;
  const color = a["border-color"] ?? "#e5e5e5";
  const w = a["border-width"] ?? "1px";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 0"><div style="border-top:${escapeAttr(w)} solid ${escapeAttr(color)};font-size:0;line-height:0">&nbsp;</div></td></tr></table>`;
}

function renderSpacer(node: MjmlNode): string {
  const h = px(node.attrs["height"], "20px");
  return `<div style="height:${h};line-height:${h};font-size:0">&nbsp;</div>`;
}

function renderColumn(node: MjmlNode): string {
  const a = node.attrs;
  const style = styleAttr([
    ["vertical-align", a["vertical-align"] ?? "top"],
    ["padding", px(a["padding"], "0")],
    ["background-color", a["background-color"]],
  ]);
  return `<td${style}>${renderChildren(node)}</td>`;
}

function renderSection(node: MjmlNode): string {
  const a = node.attrs;
  const cols = node.children.filter((c) => c.tag === "mj-column");
  const inner = cols.length > 0 ? cols.map(renderColumn).join("") : `<td>${renderChildren(node)}</td>`;
  const sectionBg = a["background-color"];
  const outerStyle = styleAttr([["background-color", sectionBg], ["padding", px(a["padding"], "0")]]);
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${outerStyle}>` +
    `<tr><td align="center" style="padding:0 16px">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;margin:0 auto">` +
    `<tr>${inner}</tr>` +
    `</table></td></tr></table>`
  );
}

function renderBody(node: MjmlNode): string {
  const bg = node.attrs["background-color"] ?? "#f4f4f5";
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${escapeAttr(bg)};margin:0;padding:24px 0">` +
    `<tr><td>${renderChildren(node)}</td></tr></table>`
  );
}

function renderNode(node: MjmlNode): string {
  switch (node.tag) {
    case "#text":
      return node.text ?? "";
    case "#root":
    case "mjml":
      return renderChildren(node);
    case "mj-head":
    case "mj-title":
    case "mj-preview":
    case "mj-attributes":
    case "mj-style":
      return ""; // head metadata — not rendered in body
    case "mj-body":
      return renderBody(node);
    case "mj-section":
    case "mj-wrapper":
      return renderSection(node);
    case "mj-column":
      // A column outside a section: wrap minimally.
      return `<table role="presentation" width="100%"><tr>${renderColumn(node)}</tr></table>`;
    case "mj-text":
      return renderText(node);
    case "mj-button":
      return renderButton(node);
    case "mj-image":
      return renderImage(node);
    case "mj-divider":
      return renderDivider(node);
    case "mj-spacer":
      return renderSpacer(node);
    case "mj-raw":
      return renderChildren(node);
    default:
      // Unknown / passthrough inline HTML (b, strong, em, a, p, br, span, …).
      if (VOID_TAGS.has(node.tag)) return `<${node.tag} />`;
      return `<${node.tag}>${renderChildren(node)}</${node.tag}>`;
  }
}

function extractPreview(root: MjmlNode): string | undefined {
  let found: string | undefined;
  const walk = (n: MjmlNode) => {
    if (found) return;
    if (n.tag === "mj-preview") {
      found = n.children.map((c) => c.text ?? "").join("").trim() || undefined;
      return;
    }
    n.children.forEach(walk);
  };
  walk(root);
  return found;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

/**
 * Compile an MJML-subset document to a complete HTML email document.
 * Returns the source wrapped as a single paragraph if it contains no MJML
 * tags (operator pasted raw HTML/text) — never throws.
 */
export function renderMjml(source: string): MjmlRenderResult {
  if (!source || typeof source !== "string") return { html: "" };

  // Fast path: no MJML tags at all → treat as raw HTML fragment.
  if (!/<mj[a-z-]*[\s>]/i.test(source) && !/<mjml[\s>]/i.test(source)) {
    return { html: wrapDocument(source) };
  }

  const root = parse(source);
  const body = renderNode(root);
  const preview = extractPreview(root);
  return { html: wrapDocument(body, preview), preview };
}

function wrapDocument(body: string, preview?: string): string {
  const preheader = preview
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preview}</div>`
    : "";
  return (
    `<!doctype html><html lang="fr"><head>` +
    `<meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width,initial-scale=1" />` +
    `<meta http-equiv="X-UA-Compatible" content="IE=edge" />` +
    `</head><body style="margin:0;padding:0;background-color:#f4f4f5">` +
    preheader +
    body +
    `</body></html>`
  );
}
