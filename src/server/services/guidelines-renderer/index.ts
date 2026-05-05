import { db } from "@/lib/db";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import crypto from "crypto";

import { PILLAR_STORAGE_KEYS } from "@/domain";
interface GuidelinesDocument {
  strategyId: string;
  title: string;
  generatedAt: string;
  sections: GuidelinesSection[];
  score: Record<string, unknown> | null;
  classification: string;
  brandAssets: Array<{ id: string; name: string; fileUrl: string | null; pillarTags: Record<string, number> | null }>;
  drivers: Array<{ id: string; name: string; channel: string; channelType: string }>;
}

interface GuidelinesSection {
  pillar: PillarKey;
  pillarName: string;
  content: Record<string, unknown>;
  score: number;
  confidence: number;
}

/**
 * Generates a structured brand guidelines document from strategy ADVE profile.
 */
export async function generate(strategyId: string): Promise<GuidelinesDocument> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: {
      pillars: true,
      drivers: { where: { deletedAt: null } },
      brandAssets: true,
    },
  });

  const vector = strategy.advertis_vector as Record<string, number> | null;

  const sections: GuidelinesSection[] = [];
  for (const pillar of [...PILLAR_STORAGE_KEYS] as PillarKey[]) {
    const pillarContent = strategy.pillars.find((p) => p.key === pillar);
    sections.push({
      pillar,
      pillarName: PILLAR_NAMES[pillar],
      content: (pillarContent?.content as Record<string, unknown>) ?? {},
      score: vector?.[pillar] ?? 0,
      confidence: pillarContent?.confidence ?? 0,
    });
  }

  const composite = vector ? Object.entries(vector)
    .filter(([k]) => (PILLAR_STORAGE_KEYS as readonly string[]).includes(k))
    .reduce((sum, [, v]) => sum + (v as number), 0) : 0;

  let classification = "ZOMBIE";
  if (composite > 180) classification = "ICONE";
  else if (composite > 160) classification = "CULTE";
  else if (composite > 120) classification = "FORTE";
  else if (composite > 80) classification = "ORDINAIRE";

  return {
    strategyId,
    title: `Guidelines de marque — ${strategy.name}`,
    generatedAt: new Date().toISOString(),
    sections,
    score: vector,
    classification,
    brandAssets: strategy.brandAssets.map((a) => ({
      id: a.id,
      name: a.name,
      fileUrl: a.fileUrl,
      pillarTags: a.pillarTags as Record<string, number> | null,
    })),
    drivers: strategy.drivers.map((d) => ({
      id: d.id,
      name: d.name,
      channel: d.channel,
      channelType: d.channelType,
    })),
  };
}

/**
 * Generates a full HTML guidelines document aggregating all 8 pillars,
 * brand variables, and key assets into a structured document.
 */
export async function generateGuidelines(strategyId: string): Promise<string> {
  const doc = await generate(strategyId);

  const composite = doc.score
    ? Object.entries(doc.score)
        .filter(([k]) => (PILLAR_STORAGE_KEYS as readonly string[]).includes(k))
        .reduce((sum, [, v]) => sum + (v as number), 0)
    : 0;

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${doc.title}</title>
  <style>
    :root {
      --primary: #6C3CE0;
      --primary-light: #f0e6ff;
      --text: #1a1a1a;
      --text-muted: #666;
      --border: #e5e5e5;
      --bg: #ffffff;
      --bg-alt: #f9f9f9;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: var(--text); background: var(--bg); line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 3rem 2rem; }

    /* Header */
    .header { text-align: center; margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 3px solid var(--primary); }
    .header h1 { font-size: 2rem; color: var(--primary); margin-bottom: 0.5rem; }
    .header .meta { color: var(--text-muted); font-size: 0.9rem; }

    /* Score Overview */
    .score-overview { display: flex; align-items: center; justify-content: center; gap: 2rem; margin: 2rem 0; padding: 1.5rem; background: var(--primary-light); border-radius: 12px; }
    .composite-score { font-size: 3rem; font-weight: 800; color: var(--primary); }
    .classification { font-size: 1.25rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary); }

    /* Pillar Radar */
    .pillar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin: 2rem 0; }
    .pillar-mini { text-align: center; padding: 0.75rem; background: var(--bg-alt); border-radius: 8px; border: 1px solid var(--border); }
    .pillar-mini .key { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
    .pillar-mini .name { font-size: 0.75rem; color: var(--text-muted); }
    .pillar-mini .value { font-size: 0.9rem; font-weight: 600; }

    /* Sections */
    .section { margin: 2.5rem 0; padding: 1.5rem; border: 1px solid var(--border); border-radius: 12px; border-left: 4px solid var(--primary); }
    .section h2 { color: var(--primary); font-size: 1.4rem; margin-bottom: 0.25rem; }
    .section .score-badge { display: inline-block; padding: 0.2rem 0.8rem; background: var(--primary-light); border-radius: 20px; font-weight: 600; font-size: 0.85rem; color: var(--primary); margin-bottom: 1rem; }
    .section .confidence { color: var(--text-muted); font-size: 0.8rem; margin-left: 0.5rem; }
    .section .content { margin-top: 1rem; }
    .section .content-key { font-weight: 600; color: var(--text); margin-top: 0.75rem; }
    .section .content-value { color: var(--text-muted); margin-left: 1rem; }

    /* Brand Assets */
    .assets-section { margin: 2.5rem 0; }
    .assets-section h2 { color: var(--primary); font-size: 1.4rem; margin-bottom: 1rem; border-bottom: 2px solid var(--primary); padding-bottom: 0.5rem; }
    .asset-list { list-style: none; }
    .asset-item { padding: 0.75rem 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .asset-name { font-weight: 500; }
    .asset-tags { display: flex; gap: 0.25rem; }
    .tag { padding: 0.15rem 0.5rem; background: var(--primary-light); border-radius: 4px; font-size: 0.75rem; color: var(--primary); font-weight: 500; }

    /* Drivers */
    .drivers-section { margin: 2.5rem 0; }
    .drivers-section h2 { color: var(--primary); font-size: 1.4rem; margin-bottom: 1rem; border-bottom: 2px solid var(--primary); padding-bottom: 0.5rem; }
    .driver-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
    .driver-card { padding: 0.75rem; background: var(--bg-alt); border-radius: 8px; border: 1px solid var(--border); }
    .driver-name { font-weight: 600; }
    .driver-meta { font-size: 0.8rem; color: var(--text-muted); }

    /* Footer */
    .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 2px solid var(--border); text-align: center; color: var(--text-muted); font-size: 0.8rem; }

    /* Print styles */
    @media print {
      body { font-size: 11pt; }
      .container { max-width: 100%; padding: 0; }
      .section { break-inside: avoid; }
      .pillar-grid { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(doc.title)}</h1>
      <div class="meta">Document g&eacute;n&eacute;r&eacute; le ${new Date(doc.generatedAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}</div>
    </div>

    <div class="score-overview">
      <div class="composite-score">${Math.round(composite)}/200</div>
      <div class="classification">${escapeHtml(doc.classification)}</div>
    </div>

    <div class="pillar-grid">`;

  for (const section of doc.sections) {
    html += `
      <div class="pillar-mini">
        <div class="key">${section.pillar.toUpperCase()}</div>
        <div class="name">${escapeHtml(section.pillarName)}</div>
        <div class="value">${section.score.toFixed(1)}/25</div>
      </div>`;
  }

  html += `
    </div>`;

  // Pillar detail sections
  for (const section of doc.sections) {
    html += `
    <div class="section">
      <h2>${escapeHtml(section.pillarName)}</h2>
      <span class="score-badge">${section.score.toFixed(1)}/25</span>
      <span class="confidence">Confiance: ${(section.confidence * 100).toFixed(0)}%</span>
      <div class="content">`;

    const content = section.content;
    if (Object.keys(content).length > 0) {
      for (const [key, value] of Object.entries(content)) {
        html += `
        <div class="content-key">${escapeHtml(formatContentKey(key))}</div>
        <div class="content-value">${escapeHtml(formatContentValue(value))}</div>`;
      }
    } else {
      html += `
        <div class="content-value"><em>Aucune donn&eacute;e pour ce pilier</em></div>`;
    }

    html += `
      </div>
    </div>`;
  }

  // Brand Assets section
  if (doc.brandAssets.length > 0) {
    html += `
    <div class="assets-section">
      <h2>Actifs de marque</h2>
      <ul class="asset-list">`;

    for (const asset of doc.brandAssets) {
      const tags = asset.pillarTags ?? {};
      const topTags = Object.entries(tags)
        .filter(([, v]) => v > 0.5)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      html += `
        <li class="asset-item">
          <span class="asset-name">${escapeHtml(asset.name)}</span>
          <div class="asset-tags">
            ${topTags.map(([k]) => `<span class="tag">${k.toUpperCase()}</span>`).join("")}
          </div>
        </li>`;
    }

    html += `
      </ul>
    </div>`;
  }

  // Drivers section
  if (doc.drivers.length > 0) {
    html += `
    <div class="drivers-section">
      <h2>Canaux actifs</h2>
      <div class="driver-list">`;

    for (const driver of doc.drivers) {
      html += `
        <div class="driver-card">
          <div class="driver-name">${escapeHtml(driver.name)}</div>
          <div class="driver-meta">${escapeHtml(driver.channel)} &middot; ${escapeHtml(driver.channelType)}</div>
        </div>`;
    }

    html += `
      </div>
    </div>`;
  }

  html += `
    <div class="footer">
      <p>G&eacute;n&eacute;r&eacute; par LaFus&eacute;e Industry OS &mdash; Cadre ADVERTIS&reg;</p>
      <p>Ce document est confidentiel et destin&eacute; &agrave; usage interne uniquement.</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Export guidelines as HTML string (backward-compatible).
 */
export async function exportHtml(strategyId: string): Promise<string> {
  return generateGuidelines(strategyId);
}

/**
 * Export guidelines as PDF-ready HTML with print-friendly CSS.
 * Returns an HTML document optimized for browser print-to-PDF.
 */
export async function exportPdf(strategyId: string): Promise<string> {
  const doc = await generate(strategyId);

  const composite = doc.score
    ? Object.entries(doc.score)
        .filter(([k]) => (PILLAR_STORAGE_KEYS as readonly string[]).includes(k))
        .reduce((sum, [, v]) => sum + (v as number), 0)
    : 0;

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(doc.title)}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1a1a1a;
      font-size: 10pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-break { page-break-before: always; }

    /* Cover */
    .cover { text-align: center; padding: 80px 0; }
    .cover h1 { font-size: 24pt; color: #6C3CE0; margin-bottom: 12px; }
    .cover .subtitle { font-size: 12pt; color: #666; margin-bottom: 40px; }
    .cover .score-box { display: inline-block; padding: 20px 40px; background: #f0e6ff; border-radius: 12px; }
    .cover .composite { font-size: 36pt; font-weight: 800; color: #6C3CE0; }
    .cover .class-label { font-size: 14pt; text-transform: uppercase; letter-spacing: 0.1em; color: #6C3CE0; }

    /* Content */
    .section { margin: 16px 0; padding: 12px 16px; border-left: 3px solid #6C3CE0; background: #fafafa; border-radius: 0 8px 8px 0; page-break-inside: avoid; }
    .section h2 { color: #6C3CE0; font-size: 13pt; margin-bottom: 4px; }
    .badge { display: inline-block; padding: 2px 10px; background: #f0e6ff; border-radius: 12px; font-weight: 600; font-size: 9pt; color: #6C3CE0; }
    .conf { color: #999; font-size: 8pt; margin-left: 6px; }
    .kv { margin-top: 8px; }
    .kv dt { font-weight: 600; font-size: 9pt; margin-top: 6px; }
    .kv dd { color: #555; font-size: 9pt; margin-left: 12px; }

    /* Assets table */
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9pt; }
    th { background: #6C3CE0; color: #fff; text-align: left; padding: 6px 10px; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e5e5; }
    tr:nth-child(even) td { background: #fafafa; }

    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 8pt; border-top: 1px solid #e5e5e5; padding-top: 12px; }
  </style>
</head>
<body>

  <div class="cover">
    <h1>${escapeHtml(doc.title)}</h1>
    <div class="subtitle">${new Date(doc.generatedAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}</div>
    <div class="score-box">
      <div class="composite">${Math.round(composite)}/200</div>
      <div class="class-label">${escapeHtml(doc.classification)}</div>
    </div>
  </div>

  <div class="page-break"></div>`;

  // Pillar sections
  for (const section of doc.sections) {
    html += `
  <div class="section">
    <h2>${escapeHtml(section.pillarName)} (${section.pillar.toUpperCase()})</h2>
    <span class="badge">${section.score.toFixed(1)}/25</span>
    <span class="conf">Confiance ${(section.confidence * 100).toFixed(0)}%</span>
    <dl class="kv">`;

    const content = section.content;
    if (Object.keys(content).length > 0) {
      for (const [key, value] of Object.entries(content)) {
        html += `
      <dt>${escapeHtml(formatContentKey(key))}</dt>
      <dd>${escapeHtml(formatContentValue(value))}</dd>`;
      }
    } else {
      html += `
      <dd><em>Aucune donn&eacute;e</em></dd>`;
    }

    html += `
    </dl>
  </div>`;
  }

  // Brand assets table
  if (doc.brandAssets.length > 0) {
    html += `
  <div class="page-break"></div>
  <h2 style="color:#6C3CE0;margin-bottom:12px;">Actifs de marque</h2>
  <table>
    <thead><tr><th>Nom</th><th>Piliers principaux</th></tr></thead>
    <tbody>`;

    for (const asset of doc.brandAssets) {
      const tags = asset.pillarTags ?? {};
      const topTags = Object.entries(tags)
        .filter(([, v]) => v > 0.5)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([k]) => k.toUpperCase())
        .join(", ");
      html += `
      <tr><td>${escapeHtml(asset.name)}</td><td>${topTags || "—"}</td></tr>`;
    }

    html += `
    </tbody>
  </table>`;
  }

  // Drivers table
  if (doc.drivers.length > 0) {
    html += `
  <h2 style="color:#6C3CE0;margin:20px 0 12px;">Canaux actifs</h2>
  <table>
    <thead><tr><th>Nom</th><th>Canal</th><th>Type</th></tr></thead>
    <tbody>`;

    for (const driver of doc.drivers) {
      html += `
      <tr><td>${escapeHtml(driver.name)}</td><td>${escapeHtml(driver.channel)}</td><td>${escapeHtml(driver.channelType)}</td></tr>`;
    }

    html += `
    </tbody>
  </table>`;
  }

  html += `
  <div class="footer">
    <p>LaFus&eacute;e Industry OS &mdash; Cadre ADVERTIS&reg; &mdash; Document confidentiel</p>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Generate a unique shareable link token for a strategy's guidelines.
 * Stores the token in the strategy's businessContext metadata.
 */
export async function getShareableLink(strategyId: string): Promise<{
  token: string;
  url: string;
}> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
  });

  const existing = (strategy.businessContext as Record<string, unknown>) ?? {};

  // Reuse existing token if present
  if (existing.guidelinesShareToken && typeof existing.guidelinesShareToken === "string") {
    return {
      token: existing.guidelinesShareToken,
      url: `/shared/guidelines/${existing.guidelinesShareToken}`,
    };
  }

  // Generate a new unique token
  const token = crypto.randomBytes(24).toString("hex");

  await db.strategy.update({
    where: { id: strategyId },
    data: {
      businessContext: {
        ...existing,
        guidelinesShareToken: token,
        guidelinesSharedAt: new Date().toISOString(),
      },
    },
  });

  return {
    token,
    url: `/shared/guidelines/${token}`,
  };
}

// --- Helpers ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatContentKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatContentValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
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
