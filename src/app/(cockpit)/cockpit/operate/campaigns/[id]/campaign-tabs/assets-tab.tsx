"use client";

import { trpc } from "@/lib/trpc/client";
import { Section, MiniBtn, EmptyMsg } from "./shared";
import { Download, FolderOpen } from "lucide-react";

export function AssetsTab({ campaignId }: { campaignId: string }) {
  const assetsQuery = trpc.campaignManager.listAssets.useQuery({ campaignId });
  const publishMut = trpc.campaignManager.publishAssetToBrandVault.useMutation({
    onSuccess: () => assetsQuery.refetch(),
  });

  const assets = (assetsQuery.data ?? []) as Array<Record<string, unknown>>;

  return (
    <Section title={`Assets (${assets.length})`} icon={FolderOpen}>
      {assetsQuery.isLoading ? <EmptyMsg text="Chargement..." /> : assets.length === 0 ? (
        <EmptyMsg text="Aucun asset associe a cette campagne." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <div key={a.id as string} className="rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">{(a.name as string) ?? (a.fileName as string) ?? "Asset"}</h4>
                  <p className="text-xs text-foreground-muted">{a.type as string} • v{(a.version as number) ?? 1}</p>
                  {!!a.fileSize && <p className="text-xs text-foreground-muted">{Math.round((a.fileSize as number) / 1024)} KB</p>}
                </div>
                {!!a.url && (
                  <a href={a.url as string} target="_blank" rel="noopener noreferrer" className="text-info hover:text-info">
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <MiniBtn onClick={() => publishMut.mutate({ id: a.id as string })} disabled={publishMut.isPending}>
                  Publier au Brand Vault
                </MiniBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
