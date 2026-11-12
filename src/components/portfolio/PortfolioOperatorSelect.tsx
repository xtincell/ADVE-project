"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** The existing portfolio selector also supplies the campaign tracking context. */
export function PortfolioOperatorSelect({ operatorId, operators }: {
  operatorId: string;
  operators: ReadonlyArray<{ id: string; name: string }>;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  if (operators.length <= 1) return null;
  return <label className="flex flex-wrap items-center gap-3 text-sm">Équipe
    <select aria-label="Équipe du portefeuille" value={operatorId} onChange={(event) => {
      const next = new URLSearchParams(search.toString());
      next.set("operator", event.target.value);
      router.push(`${pathname}?${next.toString()}`);
    }} className="max-w-full rounded-lg border border-border bg-background px-3 py-2">
      {operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}
    </select>
  </label>;
}
