/** Stable passage identifiers and exact excerpts for long original documents. */
import { createHash } from "node:crypto";

export interface ProductionPassage {
  key: string;
  title: string;
  text: string;
}

/** Keep every source character. Headers bound the creative decisions in Markdown;
 * long plain-text sources can still be cited by an exact, bounded excerpt. */
export function listProductionPassagesInText(source: string): ProductionPassage[] {
  const passages: ProductionPassage[] = [];
  let title = "Début du document";
  let buffer = "";
  let fence = "";
  const headings: string[] = [];
  const emit = () => {
    if (!buffer) return;
    const key = createHash("sha256").update(buffer, "utf8").digest("hex");
    passages.push({ key, title, text: buffer });
    buffer = "";
  };
  for (const line of source.match(/[^\n]+\n?|\n/g) ?? []) {
    const fenceStart = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    const heading = !fence && /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*\r?\n?$/.exec(line);
    if (heading) {
      emit();
      const level = heading[1]!.length;
      headings.length = level - 1;
      headings.push(heading[2]!.trim());
      title = headings.filter(Boolean).slice(-2).join(" › ");
    }
    if (fenceStart) {
      if (!fence) fence = fenceStart;
      else if (fenceStart[0] === fence[0] && fenceStart.length >= fence.length) fence = "";
    }
    if (buffer && buffer.length + line.length > 8_000) emit();
    buffer += line;
    while (buffer.length > 8_000) {
      const breakAt = buffer.lastIndexOf(" ", 8_000);
      let cut = breakAt > 4_000 ? breakAt + 1 : 8_000;
      if (/[\uD800-\uDBFF]/.test(buffer[cut - 1]!)) cut--;
      const remaining = buffer.slice(cut);
      buffer = buffer.slice(0, cut);
      emit();
      buffer = remaining;
    }
  }
  emit();
  return passages;
}

export function selectProductionPassages(text: string, keys: readonly string[]): string {
  if (!keys.length) return text;
  const wanted = new Set(keys);
  if (wanted.size !== keys.length) throw new Error("Un même passage figure deux fois dans la sélection.");
  const picked: string[] = [];
  for (const passage of listProductionPassagesInText(text)) {
    if (wanted.delete(passage.key)) picked.push(passage.text);
  }
  if (wanted.size) throw new Error("Un passage sélectionné a changé. Relisez la source avant la production.");
  return picked.join("\n\n");
}
