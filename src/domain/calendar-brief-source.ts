/** The immutable editorial brief an individual visual option consumes. */
import { z } from "zod";
import { productionPins } from "./production-pin";
import { productionArtwork } from "./production-artwork";

export const calendarBriefSource=z.object({
  artwork:productionArtwork.optional(),
  sourcePins:productionPins.optional(),
  assetId:z.string(),version:z.number().int().positive(),fingerprint:z.string().length(64),name:z.string(),
  text:z.string().min(1).max(32000),platform:z.string(),format:z.string().nullable(),theme:z.string().nullable(),
  angle:z.string().nullable(),family:z.string().nullable(),mode:z.enum(["NEW","REVISION"]),hasArtDirection:z.boolean().optional(),
});
export type CalendarBriefSource=z.infer<typeof calendarBriefSource>;
