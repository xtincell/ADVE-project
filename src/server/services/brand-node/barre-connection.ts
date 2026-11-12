import { PORTFOLIO_BARRE_INSTANCE } from "@/domain/portfolio-reference";

/** The configured agency corpus is not a grant to another company. */
export function canAccessBarre(actor: { role: string; operatorId: string | null }) {
  return actor.role === "ADMIN" || Boolean(actor.operatorId &&
    (process.env.PORTFOLIO_BARRE_OPERATOR_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean).includes(actor.operatorId));
}

/** Installation-controlled address, never a request parameter or a source reference. */
export function barreUpstreamUrl(path: string[]) {
  const configured = process.env.PORTFOLIO_BARRE_UPSTREAM;
  if (!configured) throw new Error("La connexion de votre équipe à La Barre reste à configurer.");
  const base = new URL(configured);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password ||
      base.pathname !== "/" || base.search || base.hash ||
      path.some((part) => !part || part === "." || part === ".." || /[\\/\u0000-\u001f\u007f]/.test(part))) {
    throw new Error("La connexion à La Barre n’est pas valide.");
  }
  return new URL(path.map(encodeURIComponent).join("/"), base);
}

/** Business source identity stays stable across a deployment's restoration. */
export function barreBinding() {
  const instance = process.env.PORTFOLIO_BARRE_INSTANCE ?? PORTFOLIO_BARRE_INSTANCE;
  const depot = process.env.PORTFOLIO_BARRE_DEPOT ?? "beignet-paradise.json";
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(instance) ||
      !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,99}\.json$/.test(depot)) {
    throw new Error("L’identité de la connexion à La Barre n’est pas valide.");
  }
  return { instance, depot };
}
