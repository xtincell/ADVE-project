import { db } from "@/lib/db";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { generate as generateValueReport, exportHtml as generateValueReportHtml } from "@/server/services/value-report-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportFormat = "JSON" | "CSV";
export type ReportExportFormat = "HTML" | "PDF" | "JSON";

export interface ExportResult {
  format: string;
  filename: string;
  data: string;
  mimeType: string;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// exportStrategy — Export complete strategy data in JSON or CSV format.
// ---------------------------------------------------------------------------

export async function exportStrategy(
  strategyId: string,
  format: ExportFormat = "JSON"
): Promise<ExportResult> {
  const data = await exportStrategyData(strategyId);

  if (format === "CSV") {
    const csvFiles = await exportAsCsv(strategyId);
    // Bundle all CSV files into a single string with section headers
    const sections: string[] = [];
    sections.push("# Strategy");
    sections.push(toCsvString([flattenObject(data.strategy)]));
    for (const [filename, content] of Object.entries(csvFiles)) {
      sections.push(`\n# ${filename.replace(".csv", "")}`);
      sections.push(content);
    }

    return {
      format: "CSV",
      filename: `strategy-${strategyId}.csv`,
      data: sections.join("\n"),
      mimeType: "text/csv",
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    format: "JSON",
    filename: `strategy-${strategyId}.json`,
    data: JSON.stringify(data, null, 2),
    mimeType: "application/json",
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// exportClientData — GDPR-style full data export for a user.
// Exports all data associated with a user account.
// ---------------------------------------------------------------------------

export async function exportClientData(userId: string): Promise<ExportResult> {
  // Fetch the user and all related data
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      accounts: {
        select: {
          id: true,
          provider: true,
          type: true,
          // Deliberately exclude tokens for security
        },
      },
      sessions: {
        select: {
          id: true,
          expires: true,
        },
      },
      talentProfile: {
        include: {
          portfolioItems: true,
          memberships: true,
          commissions: {
            select: {
              id: true,
              missionId: true,
              grossAmount: true,
              commissionRate: true,
              commissionAmount: true,
              netAmount: true,
              currency: true,
              status: true,
              paidAt: true,
              tierAtTime: true,
              createdAt: true,
            },
          },
        },
      },
      qualityReviews: {
        select: {
          id: true,
          deliverableId: true,
          verdict: true,
          pillarScores: true,
          overallScore: true,
          feedback: true,
          reviewType: true,
          createdAt: true,
        },
      },
    },
  });

  // Fetch all strategies owned by this user
  const strategies = await db.strategy.findMany({
    where: { userId },
    include: {
      pillars: true,
      drivers: {
        select: {
          id: true,
          channel: true,
          channelType: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
      campaigns: {
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
      missions: {
        select: {
          id: true,
          title: true,
          status: true,
          mode: true,
          createdAt: true,
        },
      },
      devotionSnapshots: {
        orderBy: { measuredAt: "desc" },
        take: 50,
      },
      brandAssets: {
        select: {
          id: true,
          name: true,
          fileUrl: true,
          createdAt: true,
        },
      },
    },
  });

  // Fetch QuickIntakes by email
  const quickIntakes = await db.quickIntake.findMany({
    where: { contactEmail: user.email },
    select: {
      id: true,
      contactName: true,
      contactEmail: true,
      companyName: true,
      sector: true,
      country: true,
      businessModel: true,
      positioning: true,
      classification: true,
      status: true,
      createdAt: true,
      completedAt: true,
      // Exclude responses/diagnostic for brevity; include if needed
    },
  });

  const exportData = {
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      userId,
      dataSubject: user.email,
      exportType: "GDPR_FULL_EXPORT",
    },
    personalData: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    authProviders: user.accounts.map((a) => ({
      provider: a.provider,
      type: a.type,
    })),
    activeSessions: user.sessions.length,
    talentProfile: user.talentProfile
      ? {
          displayName: user.talentProfile.displayName,
          bio: user.talentProfile.bio,
          skills: user.talentProfile.skills,
          tier: user.talentProfile.tier,
          firstPassRate: user.talentProfile.firstPassRate,
          totalMissions: user.talentProfile.totalMissions,
          avgScore: user.talentProfile.avgScore,
          portfolioItems: user.talentProfile.portfolioItems.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            createdAt: p.createdAt,
          })),
          memberships: user.talentProfile.memberships.map((m) => ({
            tier: m.tier,
            status: m.status,
            amount: m.amount,
            currency: m.currency,
            periodStart: m.currentPeriodStart,
            periodEnd: m.currentPeriodEnd,
          })),
          commissions: user.talentProfile.commissions,
        }
      : null,
    qualityReviews: user.qualityReviews,
    strategies: strategies.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      advertis_vector: s.advertis_vector,
      businessContext: s.businessContext,
      createdAt: s.createdAt,
      pillars: s.pillars.map((p) => ({
        key: p.key,
        content: p.content,
        confidence: p.confidence,
      })),
      drivers: s.drivers,
      campaigns: s.campaigns,
      missions: s.missions,
      devotionSnapshots: s.devotionSnapshots,
      brandAssets: s.brandAssets,
    })),
    quickIntakes,
  };

  return {
    format: "JSON",
    filename: `user-data-export-${userId}.json`,
    data: JSON.stringify(exportData, null, 2),
    mimeType: "application/json",
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// exportValueReport — Export a value report as HTML, PDF-ready HTML, or JSON.
// ---------------------------------------------------------------------------

export async function exportValueReport(
  strategyId: string,
  period: string,
  format: ReportExportFormat = "HTML"
): Promise<ExportResult> {
  if (format === "JSON") {
    const report = await generateValueReport(strategyId, period);
    return {
      format: "JSON",
      filename: `value-report-${strategyId}-${period}.json`,
      data: JSON.stringify(report, null, 2),
      mimeType: "application/json",
      generatedAt: new Date().toISOString(),
    };
  }

  // HTML and PDF both generate styled HTML (PDF adds print-optimized styles)
  const report = await generateValueReport(strategyId, period);
  const isPdf = format === "PDF";

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { name: true },
  });

  const htmlReport = {
    ...report,
    devotion: report.devotion?.current ?? null,
    recommendations: report.recommendations.map((r) => r.recommendation),
  };
  const html = buildReportHtml(htmlReport, strategy?.name ?? "Strategy", period, isPdf);

  return {
    format: isPdf ? "PDF" : "HTML",
    filename: `value-report-${strategyId}-${period}.${isPdf ? "pdf" : "html"}`,
    data: html,
    mimeType: isPdf ? "application/pdf" : "text/html",
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Existing functions (kept for backward compatibility)
// ---------------------------------------------------------------------------

export async function exportStrategyData(strategyId: string) {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: {
      pillars: true,
      drivers: true,
      campaigns: true,
      missions: true,
      devotionSnapshots: { orderBy: { measuredAt: "desc" }, take: 10 },
      signals: { orderBy: { createdAt: "desc" }, take: 20 },
      gloryOutputs: { orderBy: { createdAt: "desc" }, take: 10 },
      brandAssets: true,
    },
  });

  const {
    pillars,
    drivers,
    campaigns,
    missions,
    devotionSnapshots,
    signals,
    gloryOutputs,
    brandAssets,
    ...strategyCore
  } = strategy;

  return {
    strategy: strategyCore,
    pillars,
    drivers,
    campaigns,
    missions,
    devotionSnapshots,
    signals,
    gloryOutputs,
    brandAssets,
  };
}

export async function exportAsCsv(strategyId: string) {
  const data = await exportStrategyData(strategyId);

  const files: Record<string, string> = {};

  if (data.pillars.length > 0)
    files["pillars.csv"] = toCsvString(
      data.pillars as unknown as Record<string, unknown>[]
    );
  if (data.drivers.length > 0)
    files["drivers.csv"] = toCsvString(
      data.drivers as unknown as Record<string, unknown>[]
    );
  if (data.campaigns.length > 0)
    files["campaigns.csv"] = toCsvString(
      data.campaigns as unknown as Record<string, unknown>[]
    );
  if (data.missions.length > 0)
    files["missions.csv"] = toCsvString(
      data.missions as unknown as Record<string, unknown>[]
    );

  return files;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

function buildReportHtml(
  report: {
    strategyId: string;
    period: string;
    generatedAt: string;
    summary: {
      currentScore: number;
      previousScore: number;
      delta: number;
      classification: string;
    };
    pillarEvolution: Array<{
      pillar: PillarKey;
      name: string;
      current: number;
      previous: number;
      delta: number;
    }>;
    devotion: Record<string, number> | null;
    missionStats: { total: number; completed: number; avgQcScore: number };
    recommendations: string[];
  },
  strategyName: string,
  period: string,
  forPdf: boolean
): string {
  const classColor: Record<string, string> = {
    ZOMBIE: "#e74c3c",
    ORDINAIRE: "#f39c12",
    FORTE: "#3498db",
    CULTE: "#9b59b6",
    ICONE: "#2ecc71",
  };

  const scoreColor = classColor[report.summary.classification] ?? "#333";

  const pillarRows = report.pillarEvolution
    .map(
      (p) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${p.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${p.current.toFixed(1)}/25</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${p.previous.toFixed(1)}/25</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;color:${p.delta >= 0 ? "#2ecc71" : "#e74c3c"}">${p.delta >= 0 ? "+" : ""}${p.delta.toFixed(1)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">
          <div style="background:#eee;border-radius:4px;height:20px;width:100%">
            <div style="background:${scoreColor};border-radius:4px;height:20px;width:${(p.current / 25) * 100}%"></div>
          </div>
        </td>
      </tr>`
    )
    .join("");

  const devotionSection = report.devotion
    ? `
    <h2 style="color:#2c3e50;margin-top:30px">Devotion Funnel</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        ${Object.entries(report.devotion)
          .map(
            ([stage, value]) => `
          <td style="text-align:center;padding:12px">
            <div style="font-size:24px;font-weight:700;color:${scoreColor}">${(value * 100).toFixed(0)}%</div>
            <div style="font-size:12px;color:#7f8c8d;text-transform:capitalize">${stage}</div>
          </td>`
          )
          .join("")}
      </tr>
    </table>`
    : "";

  const recommendationItems = report.recommendations
    .map((r) => `<li style="margin-bottom:8px">${r}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Value Report - ${strategyName} - ${period}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: #fff; color: #2c3e50; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid ${scoreColor}; }
    .score-badge { display: inline-block; padding: 16px 32px; border-radius: 12px; background: ${scoreColor}; color: #fff; font-size: 48px; font-weight: 700; }
    .classification { font-size: 18px; color: ${scoreColor}; font-weight: 600; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #2c3e50; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #95a5a6; text-align: center; }
    ${forPdf ? "@media print { body { padding: 20px; } .container { max-width: 100%; } }" : ""}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0 0 8px 0;font-size:28px">${strategyName}</h1>
      <p style="margin:0 0 20px 0;color:#7f8c8d">Value Report - ${period}</p>
      <div class="score-badge">${report.summary.currentScore.toFixed(0)}/200</div>
      <div class="classification">${report.summary.classification}</div>
      <p style="margin-top:8px;color:#7f8c8d;font-size:14px">
        Delta: ${report.summary.delta >= 0 ? "+" : ""}${report.summary.delta.toFixed(1)} pts
      </p>
    </div>

    <h2 style="color:#2c3e50">ADVE Pillar Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Pillar</th>
          <th style="text-align:center">Current</th>
          <th style="text-align:center">Previous</th>
          <th style="text-align:center">Delta</th>
          <th>Progress</th>
        </tr>
      </thead>
      <tbody>
        ${pillarRows}
      </tbody>
    </table>

    ${devotionSection}

    <h2 style="color:#2c3e50;margin-top:30px">Mission Statistics</h2>
    <table>
      <tr>
        <td style="padding:12px;text-align:center">
          <div style="font-size:32px;font-weight:700;color:#2c3e50">${report.missionStats.total}</div>
          <div style="font-size:12px;color:#7f8c8d">Total Missions</div>
        </td>
        <td style="padding:12px;text-align:center">
          <div style="font-size:32px;font-weight:700;color:#2ecc71">${report.missionStats.completed}</div>
          <div style="font-size:12px;color:#7f8c8d">Completed</div>
        </td>
        <td style="padding:12px;text-align:center">
          <div style="font-size:32px;font-weight:700;color:#3498db">${report.missionStats.avgQcScore.toFixed(1)}</div>
          <div style="font-size:12px;color:#7f8c8d">Avg QC Score</div>
        </td>
      </tr>
    </table>

    <h2 style="color:#2c3e50;margin-top:30px">Recommendations</h2>
    <ul style="line-height:1.8">
      ${recommendationItems}
    </ul>

    <div class="footer">
      <p>Generated: ${report.generatedAt} | LaFusee Industry OS | Strategy ID: ${report.strategyId}</p>
    </div>
  </div>
</body>
</html>`;
}
