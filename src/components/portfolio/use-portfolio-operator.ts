"use client";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

/** An administrator may operate a portfolio without belonging to its agency. */
export function usePortfolioOperator() {
  const search = useSearchParams();
  const me = trpc.auth.me.useQuery();
  const own = trpc.operator.getOwn.useQuery();
  const isAdmin = me.data?.role === "ADMIN";
  const available = trpc.operator.list.useQuery(undefined, { enabled: isAdmin });
  const operators = isAdmin ? [...(available.data ?? [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) : own.data ? [own.data] : [];
  const requested = search.get("operator");
  const operator = operators.find((o) => o.id === requested) ?? own.data ?? operators[0] ?? null;
  return { operator, operators, isLoading: me.isLoading || own.isLoading || (isAdmin && available.isLoading), error: me.error ?? own.error ?? (isAdmin ? available.error : null) };
}
