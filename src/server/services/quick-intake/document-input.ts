/** Pure file reading for both intake paths. Providers and scoring stay downstream. */
import { extractReceivedFile } from "@/server/services/ingestion-pipeline/extractors";
import { decodeSourceUpload } from "@/server/services/ingestion-pipeline/original";

export async function readIntakeDocument(file: { name: string; content: string; type: string }) {
  const byMime: Record<string, string> = {
    "application/pdf": "PDF", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX", "text/plain": "TXT",
  };
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : undefined;
  const fileType = extension ?? byMime[file.type] ?? "TXT";
  const result = await extractReceivedFile(fileType, decodeSourceUpload(file.content), "intake");
  const text = result.text.trim();
  if (text.length <= 50) throw new Error("Texte documentaire insuffisant.");
  // Keep the previous PDF/Word context window; plain text is not newly truncated.
  const context = ["PDF", "DOCX"].includes(fileType) ? text.slice(0, 20_000) : text;
  return `[DOCUMENT: ${file.name}]\n${context}`;
}
