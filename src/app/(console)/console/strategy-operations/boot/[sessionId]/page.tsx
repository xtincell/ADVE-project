"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

const PILLAR_ORDER: PillarKey[] = ["a", "d", "v", "e", "r", "t", "i", "s"];

export default function BootSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const { data: state, isLoading } = trpc.bootSequence.getState.useQuery({ strategyId: sessionId });
  const advanceMutation = trpc.bootSequence.advance.useMutation();
  const completeMutation = trpc.bootSequence.complete.useMutation();

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Chargement de la session...</div>;
  }

  if (!state) {
    return <div className="p-8 text-destructive">Session introuvable</div>;
  }

  const currentStep = state.currentStep ?? 0;
  const pillar = PILLAR_ORDER[currentStep];
  const isComplete = currentStep >= 8;

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <h1 className="text-2xl font-bold">Boot Sequence terminé</h1>
        <p className="text-muted-foreground">Le profil ADVE du client a été calibré sur les 8 piliers.</p>
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-3xl font-bold text-primary">Profil calibré</p>
          <p className="mt-2 text-sm text-muted-foreground">Le First Value Protocol peut maintenant être déclenché.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Boot Sequence</h1>
        <span className="text-sm text-muted-foreground">Étape {currentStep + 1}/8</span>
      </div>

      <div className="h-2 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((currentStep + 1) / 8) * 100}%` }} />
      </div>

      {pillar && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {pillar.toUpperCase()} — {PILLAR_NAMES[pillar]}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Notes d{"'"}observation</label>
              <textarea
                value={responses.notes ?? ""}
                onChange={(e) => setResponses({ ...responses, notes: e.target.value })}
                rows={4}
                className="w-full rounded-lg border px-4 py-3 text-sm"
                placeholder="Observations sur ce pilier pour ce client..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Score estimé (0-25)</label>
              <input
                type="number"
                min={0}
                max={25}
                value={responses.score ?? ""}
                onChange={(e) => setResponses({ ...responses, score: e.target.value })}
                className="w-32 rounded-lg border px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confidence (0-100%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={responses.confidence ?? ""}
                onChange={(e) => setResponses({ ...responses, confidence: e.target.value })}
                className="w-32 rounded-lg border px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                advanceMutation.mutate({
                  strategyId: sessionId,
                  step: currentStep,
                  responses: { [pillar]: responses },
                });
                setResponses({});
              }}
              disabled={advanceMutation.isPending}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {currentStep < 7 ? "Pilier suivant" : "Terminer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
