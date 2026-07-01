/**
 * seed-channel-specs.ts — Catalogue canaux × specs techniques (ADR-0111).
 *
 * Les contraintes de livraison par canal (ratio, résolution, codec, loudness…)
 * en LIGNES de référence mutables, jamais en code. `buildChannelSpecRows()` PUR.
 */

import type { PrismaClient } from "@prisma/client";

export interface ChannelSpecSeedRow {
  key: string;
  channel: string;
  label: string;
  aspectRatio?: string;
  resolution?: string;
  durationSec?: number;
  codec?: string;
  frameRate?: number;
  loudnessTarget?: string;
  captionRequired?: boolean;
  fileFormat?: string;
  maxFileMb?: number;
  note?: string;
}

/** Catalogue canon (specs broadcast/social/OOH/print). PUR. */
export function buildChannelSpecRows(): ChannelSpecSeedRow[] {
  return [
    { key: "TV_HD_16x9", channel: "TV", label: "TV HD 16:9", aspectRatio: "16:9", resolution: "1920x1080", durationSec: 30, codec: "H.264", frameRate: 25, loudnessTarget: "-23 LUFS", fileFormat: "MXF/MP4", captionRequired: false },
    { key: "CTV_4K_16x9", channel: "CTV", label: "CTV 4K 16:9", aspectRatio: "16:9", resolution: "3840x2160", durationSec: 30, codec: "H.265", frameRate: 25, loudnessTarget: "-23 LUFS", fileFormat: "MP4", captionRequired: false },
    { key: "META_FEED_1x1", channel: "META", label: "Meta Feed 1:1", aspectRatio: "1:1", resolution: "1080x1080", durationSec: 15, codec: "H.264", frameRate: 30, loudnessTarget: "-16 LUFS", fileFormat: "MP4", maxFileMb: 4096, captionRequired: true },
    { key: "META_REELS_9x16", channel: "META", label: "Meta Reels 9:16", aspectRatio: "9:16", resolution: "1080x1920", durationSec: 30, codec: "H.264", frameRate: 30, loudnessTarget: "-16 LUFS", fileFormat: "MP4", maxFileMb: 4096, captionRequired: true },
    { key: "TIKTOK_9x16", channel: "TIKTOK", label: "TikTok 9:16", aspectRatio: "9:16", resolution: "1080x1920", durationSec: 30, codec: "H.264", frameRate: 30, loudnessTarget: "-14 LUFS", fileFormat: "MP4", maxFileMb: 500, captionRequired: true },
    { key: "YOUTUBE_16x9", channel: "YOUTUBE", label: "YouTube 16:9", aspectRatio: "16:9", resolution: "1920x1080", durationSec: 60, codec: "H.264", frameRate: 30, loudnessTarget: "-14 LUFS", fileFormat: "MP4", captionRequired: true },
    { key: "YOUTUBE_SHORTS_9x16", channel: "YOUTUBE", label: "YouTube Shorts 9:16", aspectRatio: "9:16", resolution: "1080x1920", durationSec: 60, codec: "H.264", frameRate: 30, loudnessTarget: "-14 LUFS", fileFormat: "MP4", captionRequired: true },
    { key: "OOH_4x3M", channel: "OOH", label: "Affichage 4x3m", aspectRatio: "4:3", resolution: "300dpi", fileFormat: "PDF/X-1a", note: "Fonds perdus 5mm, CMJN", captionRequired: false },
    { key: "OOH_DOOH_16x9", channel: "DOOH", label: "DOOH écran 16:9", aspectRatio: "16:9", resolution: "1920x1080", durationSec: 10, codec: "H.264", frameRate: 25, fileFormat: "MP4", captionRequired: false },
    { key: "PRINT_A4", channel: "PRINT", label: "Presse A4", aspectRatio: "210:297", resolution: "300dpi", fileFormat: "PDF/X-1a", note: "Fonds perdus 3mm, CMJN", captionRequired: false },
    { key: "RADIO_SPOT", channel: "RADIO", label: "Spot radio", durationSec: 30, loudnessTarget: "-19 LUFS", fileFormat: "WAV 48kHz", captionRequired: false },
  ];
}

export async function seedChannelSpecs(prisma: PrismaClient): Promise<number> {
  const rows = buildChannelSpecRows();
  for (const r of rows) {
    await prisma.channelSpecReference.upsert({
      where: { key: r.key },
      update: {
        channel: r.channel, label: r.label, aspectRatio: r.aspectRatio ?? null, resolution: r.resolution ?? null,
        durationSec: r.durationSec ?? null, codec: r.codec ?? null, frameRate: r.frameRate ?? null,
        loudnessTarget: r.loudnessTarget ?? null, captionRequired: r.captionRequired ?? false,
        fileFormat: r.fileFormat ?? null, maxFileMb: r.maxFileMb ?? null, note: r.note ?? null,
      },
      create: {
        key: r.key, channel: r.channel, label: r.label, aspectRatio: r.aspectRatio ?? null, resolution: r.resolution ?? null,
        durationSec: r.durationSec ?? null, codec: r.codec ?? null, frameRate: r.frameRate ?? null,
        loudnessTarget: r.loudnessTarget ?? null, captionRequired: r.captionRequired ?? false,
        fileFormat: r.fileFormat ?? null, maxFileMb: r.maxFileMb ?? null, note: r.note ?? null,
      },
    });
  }
  return rows.length;
}
