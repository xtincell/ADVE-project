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
  const isLoading = me.isLoading || own.isLoading || (isAdmin && available.isLoading);
  const operator = requested
    ? operators.find((o) => o.id === requested) ?? null
    : own.data ?? operators[0] ?? null;
  const error = me.error ?? own.error ?? (isAdmin ? available.error : null)
    ?? (!isLoading && requested && !operator ? new Error("L’équipe demandée n’est pas accessible depuis ce compte.") : null);
  const refetch = () => Promise.all([me.refetch(), own.refetch(), ...(isAdmin ? [available.refetch()] : [])]);
  return { operator, operators, isLoading, error, refetch };
}
