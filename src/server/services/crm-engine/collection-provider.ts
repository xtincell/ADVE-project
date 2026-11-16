/** Account approval for the existing CinetPay rail; credentials remain in env. */
import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { isGodModeEmail } from "@/lib/auth/god-mode";
import type { SalesState } from "./commercial";
import { resolveCinetpaySettings } from "../anubis/delivery-settings";

const text = z.string().trim().min(1).max(4000);
export const salesMerchantAccountSchema = z.object({
  version: z.literal(1), mode: z.literal("LIVE"),
  credentialFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  merchantAccountId: text, beneficiary: text, destinationRef: text,
  countryCode: z.string().regex(/^[A-Z]{2}$/), currency: z.enum(["XOF", "XAF"]),
  authorizedStrategyIds: z.array(z.string().min(1)).min(1).max(100),
  accountActive: z.literal(true), attestedAt: z.string().datetime(),
  expiresAt: z.string().datetime(), evidenceRef: text,
}).strict();
export type SalesMerchantAccount = z.infer<typeof salesMerchantAccountSchema>;
type ConfigClient = Pick<Prisma.TransactionClient, "paymentProviderConfig" | "user">;
type Collection = NonNullable<NonNullable<SalesState["mandate"]>["collection"]>;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function fail(message: string): never { throw new TRPCError({ code: "PRECONDITION_FAILED", message }); }
export async function cinetpayCredentialFingerprint(): Promise<string> {
  const settings = await resolveCinetpaySettings();
  return hash(JSON.stringify([settings.apiKey ?? "", settings.apiPassword ?? ""]));
}
/** No network call: an unavailable or mismatched account cannot initialize a checkout. */
export async function approvedSalesMerchantIn(client: ConfigClient, strategyId: string, beneficiary: string, destinationRef: string) {
  const settings = await resolveCinetpaySettings();
  if (settings.baseUrl !== "https://api.cinetpay.co" || !/^sk_live_/i.test(settings.apiKey ?? "") || !settings.apiPassword) {
    fail("Le paiement en ligne de cette marque n’est pas disponible : le compte de production doit être confirmé.");
  }
  const row = await client.paymentProviderConfig.findUnique({ where: { providerId: "CINETPAY" } });
  const parsed = salesMerchantAccountSchema.safeParse((row?.config as { salesCollection?: unknown } | null)?.salesCollection);
  if (!row?.enabled || !row.updatedBy || !parsed.success) fail("Le compte d’encaissement de cette marque doit être confirmé avant un paiement en ligne.");
  const account = parsed.data;
  const approver = await client.user.findUnique({ where: { id: row.updatedBy }, select: { role: true, email: true } });
  if (!approver || (approver.role !== "ADMIN" && !isGodModeEmail(approver.email)) ||
      Date.parse(account.attestedAt) > Date.now() + 30000 || Date.parse(account.expiresAt) <= Date.now() ||
      account.credentialFingerprint !== hash(JSON.stringify([settings.apiKey ?? "", settings.apiPassword ?? ""])) || !account.authorizedStrategyIds.includes(strategyId) ||
      account.beneficiary !== beneficiary || account.destinationRef !== destinationRef) {
    fail("Le compte d’encaissement approuvé ne correspond plus à cette marque ou à son bénéficiaire.");
  }
  return { ...account, providerAccountHash: hash(JSON.stringify({ id: row.id, updatedBy: row.updatedBy, account })) };
}
export async function freezeSalesCollectionIn(client: ConfigClient, strategyId: string, beneficiary: string, collection: Collection): Promise<Collection> {
  if (collection.mode === "MANUAL") {
    const { providerAccountHash: _hash, ...manual } = collection;
    return manual;
  }
  const account = await approvedSalesMerchantIn(client, strategyId, beneficiary, collection.destinationRef);
  return { ...collection, providerAccountHash: account.providerAccountHash };
}
export async function assertFrozenSalesCollectionIn(client: ConfigClient, strategyId: string, beneficiary: string, collection: Collection) {
  const account = await approvedSalesMerchantIn(client, strategyId, beneficiary, collection.destinationRef);
  if (collection.providerAccountHash !== account.providerAccountHash) fail("Le compte d’encaissement a changé. Le propriétaire doit confirmer de nouveau ces conditions de vente.");
  return account;
}
