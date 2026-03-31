/**
 * Public /200 Score Widget — Embeddable widget for external sites
 * Returns either JSON data or an SVG badge
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const CLASSIFICATION_COLORS: Record<string, string> = {
  ZOMBIE: "#ef4444",
  ORDINAIRE: "#f59e0b",
  FORTE: "#3b82f6",
  CULTE: "#8b5cf6",
  ICONE: "#f472b6",
};

function getClassification(score: number): string {
  if (score <= 80) return "ZOMBIE";
  if (score <= 120) return "ORDINAIRE";
  if (score <= 160) return "FORTE";
  if (score <= 180) return "CULTE";
  return "ICONE";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const format = searchParams.get("format") ?? "json";

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const intake = await db.quickIntake.findUnique({ where: { shareToken: token } });
    if (!intake || intake.status === "IN_PROGRESS") {
      return NextResponse.json({ error: "Score not found or not yet available" }, { status: 404 });
    }

    const vec = intake.advertis_vector as Record<string, number> | null;
    const composite = vec
      ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce((sum, k) => sum + (vec[k] ?? 0), 0)
      : 0;
    const classification = intake.classification ?? getClassification(composite);
    const color = CLASSIFICATION_COLORS[classification] ?? "#71717a";

    if (format === "svg") {
      const svg = generateSVGBadge(composite, classification, color);
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (format === "embed") {
      const html = generateEmbedHTML(token, composite, classification, color);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Default JSON
    return NextResponse.json({
      score: Math.round(composite),
      maxScore: 200,
      classification,
      pillars: vec ? {
        authenticite: vec.a ?? 0,
        distinction: vec.d ?? 0,
        valeur: vec.v ?? 0,
        engagement: vec.e ?? 0,
        risk: vec.r ?? 0,
        track: vec.t ?? 0,
        implementation: vec.i ?? 0,
        strategie: vec.s ?? 0,
      } : null,
      companyName: intake.companyName,
      sector: intake.sector,
      generatedAt: intake.completedAt?.toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function generateSVGBadge(score: number, classification: string, color: string): string {
  const rounded = Math.round(score);
  const percentage = Math.round((score / 200) * 100);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (percentage / 100) * circumference;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
  <rect width="200" height="120" rx="12" fill="#18181b"/>
  <circle cx="60" cy="55" r="40" fill="none" stroke="#27272a" stroke-width="6"/>
  <circle cx="60" cy="55" r="40" fill="none" stroke="${color}" stroke-width="6"
    stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
    stroke-linecap="round" transform="rotate(-90 60 55)"/>
  <text x="60" y="52" text-anchor="middle" fill="white" font-size="18" font-weight="bold" font-family="system-ui">${rounded}</text>
  <text x="60" y="68" text-anchor="middle" fill="#71717a" font-size="10" font-family="system-ui">/200</text>
  <text x="145" y="40" text-anchor="middle" fill="${color}" font-size="11" font-weight="600" font-family="system-ui">${classification}</text>
  <text x="145" y="58" text-anchor="middle" fill="#a1a1aa" font-size="9" font-family="system-ui">ADVE Score</text>
  <text x="145" y="80" text-anchor="middle" fill="#52525b" font-size="8" font-family="system-ui">by LaFusée</text>
</svg>`;
}

function generateEmbedHTML(token: string, score: number, classification: string, color: string): string {
  const origin = process.env.NEXTAUTH_URL ?? "https://lafusee.app";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; background: transparent; font-family: system-ui, sans-serif; }
  .widget { background: #18181b; border-radius: 12px; padding: 16px; display: inline-flex; align-items: center; gap: 16px; }
  .score { font-size: 32px; font-weight: 700; color: white; }
  .max { font-size: 14px; color: #71717a; }
  .classification { font-size: 13px; font-weight: 600; color: ${color}; }
  .label { font-size: 11px; color: #a1a1aa; }
  a { color: #52525b; font-size: 10px; text-decoration: none; }
  a:hover { color: #a1a1aa; }
</style></head><body>
<div class="widget">
  <div><span class="score">${Math.round(score)}</span><span class="max">/200</span></div>
  <div>
    <div class="classification">${classification}</div>
    <div class="label">ADVE Score</div>
    <a href="${origin}/score?token=${token}" target="_blank">Powered by LaFusée</a>
  </div>
</div>
</body></html>`;
}
