/** Exact financial units shared by collection and paid-report rights. */
import { TRPCError } from "@trpc/server";
const currencies = { XOF: 0, XAF: 0, EUR: 2, USD: 2, MAD: 2, NGN: 2, GHS: 2, CDF: 2, TND: 3 } as const;
export type SalesPaymentCurrency = keyof typeof currencies;
function exponent(currency: string) {
  if (!Object.hasOwn(currencies, currency)) throw new TRPCError({ code: "BAD_REQUEST", message: "Cette devise n’est pas prise en charge pour un paiement." });
  return currencies[currency as SalesPaymentCurrency];
}
/** Convert the declared decimal exactly; do not round a price to a different financial promise. */
export function salesAmountToMinor(amount: number, currency: string): number {
  const places = exponent(currency);
  if (!Number.isFinite(amount) || amount < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Montant de règlement invalide." });
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(amount));
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Montant de règlement invalide." });
  let minor = BigInt(match[1]! + (match[2] ?? ""));
  const power = places + Number(match[3] ?? 0) - (match[2]?.length ?? 0);
  if (power >= 0) minor *= BigInt(10) ** BigInt(power);
  else {
    const divisor = BigInt(10) ** BigInt(-power);
    if (minor % divisor !== BigInt(0)) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce montant contient trop de décimales pour cette devise." });
    minor /= divisor;
  }
  if (minor > BigInt(2147483647)) throw new TRPCError({ code: "BAD_REQUEST", message: "Le montant dépasse la limite acceptée pour ce paiement." });
  return Number(minor);
}
/** Only this new tier uses ISO minor units; historical intake amounts keep their original contract. */
export function paymentMajorAmount(payment: { tierKey?: string | null; amount: number; currency: string }): number {
  return payment.tierKey === "SALES_COLLECTION" ? payment.amount / 10 ** exponent(payment.currency) : payment.amount;
}

