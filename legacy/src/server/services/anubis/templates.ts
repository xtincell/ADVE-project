/**
 * Anubis — Template engine (Handlebars + MJML).
 *
 * Cf. ADR-0025. Charge NotificationTemplate depuis Prisma, compile Handlebars
 * pour le body texte/markdown, et MJML→HTML pour le body email si présent.
 *
 * Handlebars escape par défaut. Pas de helpers custom Turing-complet pour
 * réduire la surface XSS (ADR-0025 §Sécurité).
 */

import { db } from "@/lib/db";
import { renderMjml } from "./mjml-render";

export interface RenderedTemplate {
  slug: string;
  subject?: string;
  html?: string;
  text: string;
}

export class TemplateNotFoundError extends Error {
  constructor(slug: string) {
    super(`NotificationTemplate not found: ${slug}`);
    this.name = "TemplateNotFoundError";
  }
}

type Vars = Record<string, unknown>;

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

const VAR_RE = /\{\{\s*(?:(triple)\s+)?([\w.]+)\s*\}\}/g;

function compileHandlebars(source: string, vars: Vars, escape: boolean): string {
  return source.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([\w.]+)\s*\}\}/g, (_, raw, esc) => {
    const path = (raw ?? esc) as string;
    const isRaw = Boolean(raw);
    const value = getPath(vars, path);
    if (value === undefined || value === null) return "";
    const str = typeof value === "string" ? value : String(value);
    if (!escape) return str;
    return isRaw ? str : htmlEscape(str);
  }).replace(VAR_RE, "");
}

function compileMjml(source: string): string {
  // Deterministic in-repo renderer (no external `mjml` dep — dropped 2026-06
  // for its 44 transitive vulnerabilities; cf. mjml-render.ts header).
  return renderMjml(source).html;
}

export async function renderTemplate(slug: string, vars: Vars): Promise<RenderedTemplate> {
  const tmpl = await db.notificationTemplate.findUnique({ where: { slug } });
  if (!tmpl) throw new TemplateNotFoundError(slug);

  const text = compileHandlebars(tmpl.bodyHbs, vars, false);
  const subject = tmpl.subject ? compileHandlebars(tmpl.subject, vars, false) : undefined;

  let html: string | undefined;
  if (tmpl.bodyMjml) {
    const mjmlCompiled = compileHandlebars(tmpl.bodyMjml, vars, true);
    html = compileMjml(mjmlCompiled);
  }

  return { slug, subject, html, text };
}
