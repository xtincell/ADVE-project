/** One owner approval materializes a finite, explicitly eligible sales portfolio. */
import { z } from "zod";
import { mandateSchema, outreachPolicySchema, collectionSchema } from "./commercial";

const label = z.string().trim().min(1).max(200);
export const portfolioMemberSchema = z.object({
  /** Stable source identity of this opportunity; an email is not its identity. */
  originKey: label,
  contactName: label,
  companyName: label,
  contactEmail: z.string().trim().email().optional(),
  contactPhone: z.string().trim().min(3).max(80).optional(),
}).strict().refine(member => Boolean(member.contactEmail || member.contactPhone), {
  message: "Un téléphone ou un email réel est nécessaire.",
});

export const authorizeSalesPortfolioInput = z.object({
  strategyId: label,
  representativeId: label,
  requestId: z.string().uuid(),
  market: label,
  source: z.object({
    label,
    reference: z.string().trim().min(1).max(1000),
    eligibilityBasis: z.string().trim().min(8).max(4000),
  }).strict(),
  mandate: mandateSchema.pick({
    offerId: true, offerVersion: true, offerName: true, terms: true,
    amount: true, currency: true, deliveryOwnerId: true, beneficiary: true,
    expiresAt: true, paymentInstructions: true, channels: true,
    conversationTree: true, outboundEmailEnabled: true,
  }).extend({
    outreachPolicy: outreachPolicySchema,
    collection: collectionSchema.omit({ attestedBy: true, attestedAt: true }).strict(),
  }).strict(),
  collectionAttested: z.literal(true),
  members: z.array(portfolioMemberSchema).min(1).max(5),
}).strict().superRefine((input, ctx) => {
  if (new Set(input.members.map(member => member.originKey)).size !== input.members.length) {
    ctx.addIssue({ code: "custom", path: ["members"], message: "Chaque affaire exige une identité d’origine distincte." });
  }
  if (new Date(input.mandate.outreachPolicy.firstContactAt) >= new Date(input.mandate.expiresAt)) {
    ctx.addIssue({ code: "custom", path: ["mandate", "expiresAt"], message: "Le premier contact doit précéder l’expiration du mandat." });
  }
});
export type AuthorizeSalesPortfolioInput = z.input<typeof authorizeSalesPortfolioInput>;
export type PortfolioMember = z.infer<typeof portfolioMemberSchema>;
export interface SalesPortfolioReceipt {
  requestId: string;
  intentId: string;
  strategyId: string;
  market: string;
  representativeId: string;
  representativeName: string;
  authorizedBy: string;
  authorizedAt: string;
  source: AuthorizeSalesPortfolioInput["source"];
  mandate: z.infer<typeof mandateSchema>;
  members: Array<PortfolioMember & { dealId: string; initialRunId: string | null }>;
}
export interface SalesPortfolioOutcome {
  dealId: string;
  stage: string;
  node: string;
  nextAction: string | null;
  nextDeadline: string | null;
  contactStopped: boolean;
  runStatus: string | null;
}
export interface AuthorizedSalesPortfolio {
  receipt: SalesPortfolioReceipt;
  outcomes: SalesPortfolioOutcome[];
}
