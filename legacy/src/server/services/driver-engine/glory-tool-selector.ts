/**
 * First Value Protocol (F.2): suggests the most impactful GLORY tool
 * for a given channel to deliver quick value.
 */
export function getSuggestedFirstTool(channel: string): string {
  const toolMap: Record<string, string> = {
    INSTAGRAM: "GT-SOCIAL-GRID",
    FACEBOOK: "GT-SOCIAL-CONTENT",
    TIKTOK: "GT-VIDEO-SCRIPT",
    LINKEDIN: "GT-THOUGHT-LEADERSHIP",
    WEBSITE: "GT-WEB-COPY",
    PACKAGING: "GT-PACK-DESIGN",
    EVENT: "GT-EVENT-CONCEPT",
    PR: "GT-PRESS-RELEASE",
    PRINT: "GT-PRINT-AD",
    VIDEO: "GT-VIDEO-SCRIPT",
    RADIO: "GT-AUDIO-SCRIPT",
    TV: "GT-TV-SPOT",
    OOH: "GT-OOH-CONCEPT",
    CUSTOM: "GT-BRAND-AUDIT",
  };

  return toolMap[channel] ?? "GT-BRAND-AUDIT";
}
