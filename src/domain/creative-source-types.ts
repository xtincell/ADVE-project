import { z } from "zod";

/** Shared provider identity for acquisition and explicit watch configuration. */
export const creativeSourceSchema = z.enum(["BLUESKY", "YOUTUBE", "FOREPLAY", "CONNECTED_SOCIAL", "META_AD_LIBRARY", "INSTAGRAM_DISCOVERY", "TIKTOK_RESEARCH", "TIKTOK_COMMERCIAL", "REDDIT", "X", "LINKEDIN", "BRANDWATCH", "APIFY", "RSS"]);
