/** Roles within a brand's value exchange, carried by its existing D personas.
 * Several roles may apply. Missing roles never imply customer, partner or supplier.
 * These describe a business model, not a signed agreement or an acquired account. */
export const BRAND_ACTOR_ROLES = [
  "COMMUNICATION_AUDIENCE", "USER", "PAYER", "PARTNER", "SUPPLIER", "PRESCRIBER", "DISTRIBUTOR",
] as const;

export type BrandActorRole = typeof BRAND_ACTOR_ROLES[number];

export const BRAND_ACTOR_ROLE_LABELS: Record<BrandActorRole, string> = {
  COMMUNICATION_AUDIENCE: "Public de communication",
  USER: "Utilisateur / bénéficiaire",
  PAYER: "Client payeur",
  PARTNER: "Partenaire",
  SUPPLIER: "Fournisseur",
  PRESCRIBER: "Prescripteur",
  DISTRIBUTOR: "Distributeur",
};

export function brandActorRoleLabels(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return [...new Set(roles)].flatMap(role =>
    typeof role === "string" && Object.hasOwn(BRAND_ACTOR_ROLE_LABELS, role)
      ? [BRAND_ACTOR_ROLE_LABELS[role as BrandActorRole]] : []);
}

export const BRAND_ACTOR_CONTEXT_NOTICE =
  "LECTURE DU MODÈLE — D.personas décrit tous les acteurs, pas seulement des acheteurs. " +
  "actorRoles est cumulable : COMMUNICATION_AUDIENCE=public de communication, USER=utilisateur/bénéficiaire, " +
  "PAYER=client payeur, PARTNER=partenaire, SUPPLIER=fournisseur, PRESCRIBER=prescripteur, DISTRIBUTOR=distributeur. " +
  "V.personaSegmentMap décrit leurs apports, contreparties, coûts et conditions de participation, y compris non monétaires. " +
  "Ne pas confondre public et payeur, partenaire et fournisseur, ni imposer un achat ou un parcours client à tous. " +
  "Analyser les dépendances entre offre, audience et financement sans inventer de contrat, revenu, attribution ou preuve de trafic.";

/** Only explicit product targeting establishes documentary links. */
export function deriveActorProductLinks(personas: unknown, catalogue: unknown): Array<{
  personaName: string; productNames: string[]; devotionLevel?: string;
}> {
  const records = (value: unknown): Record<string, unknown>[] => Array.isArray(value)
    ? value.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x)) : [];
  const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
  const key = (value: unknown) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return records(personas).flatMap(persona => {
    const personaName = text(persona.name ?? persona.nom);
    if (!personaName) return [];
    const targets = new Set([key(personaName), key(persona.id)].filter(Boolean));
    return [{ personaName, productNames: records(catalogue)
      .filter(product => targets.has(key(product.segmentCible)))
      .map(product => text(product.nom)).filter(Boolean),
      ...(text(persona.devotionPotential) ? { devotionLevel: text(persona.devotionPotential) } : {}),
    }];
  });
}
