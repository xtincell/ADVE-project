"use client";

import { useState } from "react";
import { Copy, Check, ImageIcon } from "lucide-react";

interface KvPromptCardProps {
  data: Record<string, unknown> | null;
}

export function KvPromptCard({ data }: KvPromptCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-center">
        <ImageIcon className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
        <p className="text-sm text-zinc-600">
          Aucun prompt KV genere. Executez l'outil Glory "KV Banana Prompt Generator" pour generer des prompts.
        </p>
      </div>
    );
  }

  const prompts = Array.isArray(data.prompts) ? data.prompts : [data];

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-zinc-300">Prompts Banana pour KV</h4>
      {prompts.map((prompt: unknown, i: number) => {
        const px = prompt as Record<string, unknown>;
        const text = typeof px.prompt === "string" ? px.prompt : JSON.stringify(px, null, 2);
        const format = typeof px.format === "string" ? px.format : `KV #${i + 1}`;
        const id = `prompt-${i}`;

        return (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-orange-500/10 px-3 py-0.5 text-xs font-semibold text-orange-400">
                {format}
              </span>
              <button
                onClick={() => copyToClipboard(text, id)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                {copied === id ? (
                  <><Check className="h-3 w-3" /> Copie</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copier</>
                )}
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-400">
              {text}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
