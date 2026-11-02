import { z } from "zod";

export const salesChannel = z.enum(["PHONE", "EMAIL", "WHATSAPP", "SMS", "WEB", "SOCIAL", "IN_PERSON"]);
const text = z.string().trim().min(1).max(4000);
const branchDecision = z.discriminatedUnion("type", [
  z.object({ type: z.literal("QUALIFY"), role: z.enum(["BUYER", "PARTNER", "AUDIENCE"]) }),
  z.object({ type: z.literal("PROPOSE") }),
  z.object({ type: z.literal("OBJECTION") }),
  z.object({ type: z.literal("ACCEPT") }),
  z.object({ type: z.literal("STOP") }),
]);
export const conversationTreeSchema = z.object({
  version: text,
  start: text,
  nodes: z.array(z.object({
    id: text, prompt: text,
    choices: z.array(z.object({ id: text, label: text, next: text, decision: branchDecision.optional() })).max(20),
  })).min(1).max(100),
}).superRefine((tree, ctx) => {
  const ids = new Set(tree.nodes.map(node => node.id));
  if (ids.size !== tree.nodes.length || !ids.has(tree.start)) {
    ctx.addIssue({ code: "custom", message: "L’arbre exige un départ et des étapes uniques." });
  }
  for (const node of tree.nodes) {
    if (new Set(node.choices.map(choice => choice.id)).size !== node.choices.length ||
      node.choices.some(choice => !ids.has(choice.next))) {
      ctx.addIssue({ code: "custom", message: "Chaque réponse doit avoir une destination et un identifiant uniques dans son étape." });
    }
  }
});
export const mandateSchema = z.object({
  offerId: text, offerVersion: text, offerName: text, terms: text,
  amount: z.number().finite().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/),
  sellerId: text, deliveryOwnerId: text, beneficiary: text,
  expiresAt: z.string().datetime(), paymentInstructions: text,
  channels: z.array(salesChannel).min(1),
  conversationTree: conversationTreeSchema.optional(),
  intakePaymentReference: text.optional(),
  outboundEmailEnabled: z.boolean().optional(),
});
export const salesCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MANDATE"), mandate: mandateSchema }),
  z.object({ type: z.literal("QUALIFY"), role: z.enum(["BUYER", "PARTNER", "AUDIENCE"]), need: text }),
  z.object({ type: z.literal("PROPOSE") }),
  z.object({ type: z.literal("OBJECTION"), evidence: text }),
  z.object({ type: z.literal("ACCEPT"), evidence: text, customerMessageId: text.optional() }),
  z.object({ type: z.literal("PAYMENT"), evidence: text, amount: z.number().finite().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/) }),
  z.object({ type: z.literal("DELIVER"), evidence: text, customerMessageId: text.optional(), nextAction: text, nextDeadline: z.string().datetime() }),
  z.object({ type: z.literal("STOP"), evidence: text }),
  z.object({ type: z.literal("HANDOVER"), sellerId: text }),
  z.object({ type: z.literal("BRANCH"), choiceId: text, evidence: text, customerMessageId: text.optional() }),
]);
export const salesStepSchema = z.object({
  requestId: z.string().uuid(), expectedRevision: z.number().int().nonnegative(),
  channel: salesChannel, command: salesCommandSchema,
});
export const salesStateSchema = z.object({
  mandate: mandateSchema.optional(),
  node: z.enum(["DISCOVERY", "QUALIFIED", "PARTNER", "AUDIENCE", "PROPOSAL", "OBJECTION", "ACCEPTED", "PAID", "DELIVERED", "STOPPED"]).default("DISCOVERY"),
  contactStopped: z.boolean().optional(),
  treeNodeId: text.optional(),
  need: text.optional(), agreement: text.optional(), payment: text.optional(), delivery: text.optional(),
  nextAction: text.optional(), nextDeadline: z.string().datetime().optional(),
});
export type SalesState = z.infer<typeof salesStateSchema>;
export type SalesStep = z.infer<typeof salesStepSchema>;
export interface SalesActor { id: string; admin: boolean }

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** The same decision contract is used by a person and an agent, on every channel. */
export function advanceSale(previous: SalesState, step: SalesStep, actor: SalesActor, now: Date, fromBranch = false): SalesState {
  const command = step.command;
  if (command.type === "MANDATE") {
    requireCondition(actor.admin, "Le mandant doit approuver les conditions.");
    requireCondition(previous.node === "DISCOVERY", "Une proposition engagée conserve son mandat.");
    requireCondition(new Date(command.mandate.expiresAt) > now, "Le mandat doit être en vigueur.");
    return { ...previous, mandate: command.mandate,
      treeNodeId: command.mandate.conversationTree?.start,
      nextAction: command.mandate.conversationTree?.nodes.find(node => node.id === command.mandate.conversationTree?.start)?.prompt ?? "Qualifier le besoin et le payeur." };
  }
  const mandate = previous.mandate;
  requireCondition(mandate, "Mandat commercial à définir.");
  requireCondition(actor.admin || actor.id === mandate.sellerId || (command.type === "DELIVER" && actor.id === mandate.deliveryOwnerId), "Titulaire non habilité.");
  if (command.type === "STOP") {
    const contracted = ["ACCEPTED", "PAID", "DELIVERED"].includes(previous.node);
    return { ...previous, contactStopped: true, node: contracted ? previous.node : "STOPPED",
      nextAction: contracted ? previous.nextAction : "Respecter le refus de contact.", nextDeadline: undefined };
  }
  const fulfillment = command.type === "PAYMENT" || command.type === "DELIVER";
  if (!fulfillment) {
    requireCondition(previous.node !== "STOPPED" && !previous.contactStopped, "Contact arrêté.");
    requireCondition(new Date(mandate.expiresAt) > now, "Mandat expiré.");
    requireCondition(mandate.channels.includes(step.channel), "Canal hors mandat.");
  }
  if (command.type === "HANDOVER") {
    requireCondition(actor.admin, "La passation doit être autorisée par le mandant.");
    return { ...previous, mandate: { ...mandate, sellerId: command.sellerId } };
  }
  if (command.type === "BRANCH") {
    const tree = mandate.conversationTree;
    const node = tree?.nodes.find(item => item.id === previous.treeNodeId);
    const choice = node?.choices.find(item => item.id === command.choiceId);
    requireCondition(tree && choice, "Réponse absente de l’étape courante.");
    let next = previous;
    if (choice.decision) {
      const decision = choice.decision.type === "QUALIFY"
        ? { ...choice.decision, need: command.evidence }
        : { ...choice.decision, evidence: command.evidence };
      next = advanceSale(previous, { ...step, command: decision }, actor, now, true);
    }
    const target = tree.nodes.find(item => item.id === choice.next)!;
    return { ...next, treeNodeId: target.id, nextAction: target.prompt };
  }
  requireCondition(!mandate.conversationTree || fromBranch ||
    !["QUALIFY", "PROPOSE", "OBJECTION", "ACCEPT"].includes(command.type), "Suivre l’arbre de vente approuvé.");
  switch (command.type) {
    case "QUALIFY":
      requireCondition(previous.node === "DISCOVERY" || previous.node === "QUALIFIED", "Qualification déjà dépassée.");
      return { ...previous, need: command.need, node: command.role === "BUYER" ? "QUALIFIED" : command.role,
        nextAction: command.role === "BUYER" ? "Présenter l’offre approuvée et ses conditions." : "Orienter vers la relation adaptée." };
    case "PROPOSE":
      requireCondition(previous.node === "QUALIFIED" || previous.node === "OBJECTION", "Qualifier un acheteur avant proposition.");
      return { ...previous, node: "PROPOSAL", nextAction: "Recueillir une décision sur les conditions présentées." };
    case "OBJECTION":
      requireCondition(previous.node === "PROPOSAL" || previous.node === "OBJECTION", "Présenter l’offre avant de traiter une objection.");
      return { ...previous, node: "OBJECTION", nextAction: "Traiter l’objection dans le mandat ou solliciter le décideur." };
    case "ACCEPT":
      requireCondition(previous.node === "PROPOSAL", "Un accord concerne une proposition explicite.");
      return { ...previous, node: "ACCEPTED", agreement: command.evidence, nextAction: mandate.paymentInstructions };
    case "PAYMENT":
      requireCondition(actor.admin, "Le rapprochement financier est réservé au mandant.");
      requireCondition(previous.node === "ACCEPTED", "Accord nécessaire avant rapprochement.");
      requireCondition(command.amount === mandate.amount && command.currency === mandate.currency, "Le règlement doit correspondre au montant et à la devise convenus.");
      return { ...previous, node: "PAID", payment: command.evidence, nextAction: "Remettre la prestation au client." };
    case "DELIVER":
      requireCondition(actor.admin || actor.id === mandate.deliveryOwnerId, "La remise doit être attestée par le responsable de livraison.");
      requireCondition(previous.node === "PAID", "Vérifier le règlement avant cette remise.");
      return { ...previous, node: "DELIVERED", delivery: command.evidence, nextAction: command.nextAction, nextDeadline: command.nextDeadline };
  }
}

export function saleStage(state: SalesState) {
  switch (state.node) {
    case "QUALIFIED": return "QUALIFIED" as const;
    case "PROPOSAL": return "PROPOSAL" as const;
    case "OBJECTION": return "NEGOTIATION" as const;
    case "ACCEPTED": case "PAID": case "DELIVERED": return "WON" as const;
    case "STOPPED": return "LOST" as const;
    default: return "LEAD" as const;
  }
}
