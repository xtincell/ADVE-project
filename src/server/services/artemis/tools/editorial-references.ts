import { documentEdition } from "@/domain/source-document";
import { loadBrandSources } from "@/server/services/ingestion-pipeline/source-usage";
import { wrapUntrusted } from "@/server/services/utils/untrusted-content";

const EDITORIAL_TAGS = ["Canaux officiels", "Calendrier social", "Planning", "Briefs de contenu", "Passation"];
export interface EditorialSource {
  id: string;
  contentHash: string;
  label: string;
  edition: number;
  tags: string[];
  text: string;
}

export function sourceCitation(source: EditorialSource) {
  return { sourceId: source.id, contentHash: source.contentHash, label: source.label, edition: source.edition };
}

export async function readEditorialSources(strategyId: string) {
  const rows = await loadBrandSources(strategyId, {
    // Another brand's channel or schedule can be shared as inspiration, never as ours.
    strategyId, processingStatus: { in: ["EXTRACTED", "PROCESSED"] },
    AND: [
      { rawData: { path: ["_document", "status"], equals: "REFERENCE" } },
      { OR: EDITORIAL_TAGS.map(tag => ({ rawData: { path: ["_document", "tags"], array_contains: [tag] } })) },
    ],
  });
  return rows.flatMap(row => {
    const doc = documentEdition(row.rawData);
    return doc && row.rawContent ? [{
      id: row.id, contentHash: row.contentHash, label: doc.label, edition: doc.edition,
      tags: doc.tags ?? [], text: row.rawContent,
    }] : [];
  });
}

export function declaredWebsite(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function channelDeclaration(sources: EditorialSource[], intakeWebsite?: string | null) {
  const recorded = sources.filter(s => s.tags.includes("Canaux officiels"));
  const read = (label: string) => {
    const candidates = new Set(recorded.flatMap(source => source.text.split(/\r?\n/).flatMap(line => {
      const match = line.match(/^([^:]+?)\s*:\s*(https?:\/\/[^\s]+)\s*$/i);
      const url = match && match[1]?.trim().toLowerCase() === label.toLowerCase() && declaredWebsite(match[2]);
      return url ? [url] : [];
    })));
    return { url: candidates.size === 1 ? [...candidates][0]! : null, conflict: candidates.size > 1 };
  };
  const website = read("Site officiel déclaré");
  return {
    website: website.url ?? (website.conflict ? null : declaredWebsite(intakeWebsite)),
    links: Object.fromEntries(["Instagram","TikTok","Facebook","X"].map(platform => [platform, read(platform).url])),
    sources: recorded.map(sourceCitation),
  };
}

const platforms: Record<string,string> = {
  instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok",
  youtube: "YouTube", twitter: "X", x: "X", threads: "Threads", pinterest: "Pinterest",
};

function parseOccurrence(block: string, source: EditorialSource) {
  const lines = block.replace(/\r\n/g, "\n").trim().split("\n");
  const head = lines[0]?.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s*\|\s*([\w-]+)\s*\|\s*([a-zA-Z0-9_-]+)\s*$/);
  const status = lines[1]?.match(/^(?:Statut|Status)\s*:\s*(scheduled|sent|published|draft|failed)$/i)?.[1]?.toLowerCase();
  const caption = lines.slice(2).join("\n").trim();
  if (!head || !status || !caption || !Number.isFinite(Date.parse(head[1]!))) return null;
  const date = new Date(head[1]!);
  const stamp = date.toISOString();
  if (head[1]!.slice(0,10) !== stamp.slice(0,10)) return null;
  const platform = platforms[head[2]!.toLowerCase()] ?? head[2]!;
  return {
    date: stamp.slice(0,10), weekday: new Intl.DateTimeFormat("fr-FR",{weekday:"long",timeZone:"UTC"}).format(date),
    week:null, platform, format:null, theme:null, angle:null,
    hashtags:caption.match(/#[\p{L}\p{N}_]+/gu) ?? [], status, caption, illustration:null,
    externalPostId:head[3]!, scheduledOrPublishedAt:stamp, source:sourceCitation(source),
  };
}

/** A source block is atomic. An unreadable line cannot quietly become a replacement caption. */
export function recordedSchedule(sources: EditorialSource[], month: string) {
  const snapshots = sources.filter(source => source.tags.includes("Calendrier social") && source.tags.includes("Versions programmées"));
  const posts = new Map<string,NonNullable<ReturnType<typeof parseOccurrence>>>();
  const conflicts: string[] = [];
  for (const source of snapshots) {
    if (!source.text.split(/\r?\n/).some(line => line.startsWith(month+"-"))) continue;
    for (const block of source.text.trim().split(/(?:^|\n)[ \t]*-{4,}[ \t]*(?=\r?\n|$)/)) {
      const occurrence = parseOccurrence(block, source);
      if (!occurrence) { conflicts.push(source.label); break; }
      if (!occurrence.date.startsWith(month+"-")) continue;
      const key = occurrence.platform + "/" + occurrence.externalPostId;
      const previous = posts.get(key);
      if (previous && (previous.caption !== occurrence.caption || previous.status !== occurrence.status || previous.scheduledOrPublishedAt !== occurrence.scheduledOrPublishedAt)) conflicts.push(source.label);
      else if (!previous) posts.set(key, occurrence);
    }
  }
  if (conflicts.length) throw new Error("Calendrier documentaire à vérifier : " + [...new Set(conflicts)].join(", "));
  return [...posts.values()].sort((a,b) => a.scheduledOrPublishedAt.localeCompare(b.scheduledOrPublishedAt) || a.platform.localeCompare(b.platform));
}

export function currentPlanningReferences(sources: EditorialSource[], month: string) {
  const monthLabel = new Intl.DateTimeFormat("fr", { month: "long", timeZone: "UTC" })
    .format(new Date(month + "-01T00:00:00Z"));
  return sources.filter(source =>
    (source.tags.includes("Planning") || source.tags.includes("Briefs de contenu"))
    && source.tags.some(tag => tag.toLowerCase() === monthLabel)
    && source.text.includes(month.slice(0, 4))
  ).sort((a,b) => Number(b.tags.includes("Planning")) - Number(a.tags.includes("Planning")));
}

/** Keep the plan's statement of scope and the named production briefs as documentary excerpts. */
export function planOutline(source: EditorialSource) {
  const lines = source.text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const scope = source.tags.includes("Planning") ? lines.slice(0, 15).filter(line =>
    /(?:\d+\s+(?:sujets|diffusions|publications)|plan\s+(?:proposé|approuvé))/i.test(line) && line.length <= 600
  ).slice(0, 1) : [];
  const subjects = lines.filter((line, index) =>
    /^P\d{1,3}\s+[\p{L}]/u.test(line) && line.length <= 200
    && /^\d{1,2}\/\d{1,2}\/\d{4}\b/.test(lines[index+1] ?? "")
  );
  return { source:sourceCitation(source), scope, subjects:[...new Set(subjects)].slice(0,50) };
}

export const EDITORIAL_REFERENCE_RULE = "Les repères de disponibilité datés s’appliquent canal par canal. Respecte les dates et les statuts du calendrier et les copies enregistrées. Un plan proposé, une programmation déclarée et une diffusion observée sont distincts. Un site ouvert ou une diffusion ne prouve ni adoption, ni disponibilité en boutique. En cas de contradiction avec un récit historique, nomme la source et la date du constat actuel.";

export function prepareEditorialEvidence(sources: EditorialSource[], month: string) {
  // Keep source identity attached to complete excerpts; never inject 60 kB of annexes.
  const datedPlans = new Set(currentPlanningReferences(sources, month));
  const relevant = sources.filter(s => s.tags.includes("Canaux officiels") || s.tags.includes("Passation")
    || s.text.includes(month+"-") || datedPlans.has(s));
  const excerpts = relevant.map(source => {
    const lines = source.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const outline = datedPlans.has(source) ? planOutline(source) : null;
    const selected = outline ? [...outline.scope, ...outline.subjects] : source.tags.includes("Canaux officiels") ? lines : source.tags.includes("Passation")
      ? lines.filter(l => /publi|programm|diffus|testflight/i.test(l)).slice(0,3) : lines.slice(0,7);
    return { ...sourceCitation(source), excerpts: (selected.length ? selected : lines.slice(0,4)).filter(l=>l.length<=1200).slice(0,20) };
  });
  const included = [];
  let used = 0;
  for (const excerpt of excerpts) {
    const size = JSON.stringify(excerpt).length + 1;
    if (used + size > 15500) continue;
    included.push(excerpt);
    used += size;
  }
  const brief = included.length ? wrapUntrusted("RÉFÉRENCES ÉDITORIALES DATÉES", JSON.stringify(included), {max:16000}) : "";
  return {sources, month, playbook:true, brief, citations:included.map(({excerpts: _text, ...citation}) => citation)};
}
export type EditorialEvidence = ReturnType<typeof prepareEditorialEvidence>;
