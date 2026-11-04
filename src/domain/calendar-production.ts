/** Dated calendar views, versioned editorial briefs, option counts and correction commands. */
import { z } from "zod";
import { productionPins } from "./production-sources";

export const calendarView = z.object({
  strategyId:z.string().trim().min(1),
  editionId:z.string().trim().min(1).max(160).optional(),
  startDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,"Date invalide.").optional(),
  weeks:z.number().int().min(1).max(12).optional(),
  projectDates:z.boolean().optional(),
});
export const calendarPreparation=calendarView.extend({
  calendarVersion:z.string().regex(/^[a-f0-9]{64}$/),
  postKeys:z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(50).refine(k=>new Set(k).size===k.length,"Ligne répétée."),
  optionsPerPost:z.number().int().min(1).max(4).default(2),
  correction:z.object({assetId:z.string().min(1),version:z.number().int().positive(),instruction:z.string().trim().min(1).max(1800),photoPolicy:z.literal("LOCKED_MASTER").optional()}).optional(),
}).superRefine((v,c)=>{if(v.correction && v.postKeys.length!==1)c.addIssue({code:"custom",message:"Une correction porte sur une seule ligne."});});
export type CalendarView=z.infer<typeof calendarView>;
export type CalendarPreparation=z.infer<typeof calendarPreparation>;
export const calendarProductionLaunch=z.object({
  strategyId:z.string().min(1),assetId:z.string().min(1),version:z.number().int().positive(),
  pins:productionPins.optional(),creativeProposalId:z.string().min(1).optional(),
});
