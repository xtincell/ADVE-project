import type { BadgeProps } from "@/components/ui/badge";

/** Affichage FR des rôles de membership + kinds de workspace (fond clair). */

export const ROLE_VARIANTS: Record<string, BadgeProps["variant"]> = {
  OPERATOR: "coral",
  OWNER: "gold",
  MEMBER: "neutral",
  CLIENT: "neutral",
};

export const ROLE_LABELS: Record<string, string> = {
  OPERATOR: "Opérateur",
  OWNER: "Propriétaire",
  MEMBER: "Membre",
  CLIENT: "Client",
};

export const KIND_VARIANTS: Record<string, BadgeProps["variant"]> = {
  AGENCY: "coral",
  BRAND: "neutral",
};

export const KIND_LABELS: Record<string, string> = {
  AGENCY: "Agence",
  BRAND: "Marque",
};
