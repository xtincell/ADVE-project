import { CONTACT } from "@/components/upgraders/data";

/**
 * Porte d'entrée de La Barre. Un refus lu par une personne devient une page
 * qui dit où se connecter et à qui demander l'accès. Les requêtes de données
 * gardent leur refus en texte : le poste natif le lit, et les reçus de
 * livraison (curl, qui accepte tout, ou urllib, sans en-tête Accept)
 * attendent ce 401.
 */

/** HTML counts only when named with a non-zero quality; a bare wildcard is a data client. */
export function acceptsHtml(request: Request) {
  return (request.headers.get("accept") ?? "").split(",").some((range) => {
    const [type, ...params] = range.split(";").map((part) => part.trim().toLowerCase());
    if (type !== "text/html" && type !== "application/xhtml+xml") return false;
    const quality = params.find((param) => param.startsWith("q="));
    return quality === undefined || Number(quality.slice(2)) > 0;
  });
}

/**
 * `navigation`: a document the browser displays, declared by Fetch Metadata or,
 * for browsers and in-app views that send none, a GET asking for HTML. A script
 * that declares another mode never follows a redirect to the sign-in page as if
 * it were its data. `page`: a reader that accepts HTML but is not redirected.
 * `data`: everything else.
 */
export function barreRequestKind(request: Request): "navigation" | "page" | "data" {
  const mode = request.headers.get("sec-fetch-mode");
  const html = acceptsHtml(request);
  if (request.method === "GET" && (mode === "navigate" || (mode === null && html))) return "navigation";
  return mode === "navigate" || html ? "page" : "data";
}

const ADDRESS = /^[^\s@<>()"',;:?&#/\\]+@[^\s@<>()"',;:?&#/\\]+\.[^\s@<>()"',;:?&#/\\]+$/;

/**
 * Who opens La Barre to a person: installation setting `PORTFOLIO_BARRE_CONTACT`,
 * « Nom <adresse> » or an address alone. Without a valid setting, La Fusée's public
 * contact, already given for access on the password page. Never an account read
 * from the base: an anonymous visitor reads this page.
 */
export function barreAccessContact(): { name: string; email: string } {
  const configured = (process.env.PORTFOLIO_BARRE_CONTACT ?? "").trim();
  const named = configured.match(/^(.{1,80}?)\s*<([^<>]+)>$/);
  const name = named?.[1]?.replace(/^"(.*)"$/, "$1").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const email = (named?.[2] ?? configured).trim();
  if (ADDRESS.test(email)) return { name: name || email, email };
  return { name: "l’équipe La Fusée", email: CONTACT.email };
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const mailto = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/** Self-contained page: no script, no form, its own styles and the La Fusée mark only. */
export const ACCESS_PAGE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
};

const STYLE = [
  ":root{color-scheme:light dark;--fond:#f5f4f1;--carte:#fff;--texte:#18181b;--doux:#52525b;--trait:#dcd8cf;--accent:#c8473c;--sur-accent:#fff}",
  "@media (prefers-color-scheme:dark){:root{--fond:#0d0d0d;--carte:#151515;--texte:#f5f4f1;--doux:#c9c3b6;--trait:#262626;--accent:#e56458;--sur-accent:#0d0d0d}}",
  "*{box-sizing:border-box}",
  "body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:var(--fond);color:var(--texte);font:16px/1.5 system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif}",
  "main{width:100%;max-width:440px;background:var(--carte);border:1px solid var(--trait);border-radius:12px;padding:28px 24px}",
  ".marque{display:flex;align-items:center;gap:8px;margin:0 0 20px;font-weight:700;color:var(--texte)}",
  ".marque img{height:26px;width:auto}",
  "h1{font-size:1.25rem;line-height:1.3;margin:0 0 12px}",
  "p{margin:0 0 16px;color:var(--doux);overflow-wrap:anywhere}",
  "strong{color:var(--texte)}",
  "a{color:var(--texte)}",
  ".action{display:block;text-align:center;padding:12px 16px;border-radius:8px;background:var(--accent);color:var(--sur-accent);font-weight:600;text-decoration:none}",
  "a:focus-visible{outline:2px solid var(--texte);outline-offset:2px}",
  ".suite{font-size:.875rem;margin:20px 0 0}",
].join("\n");

function pageDocument(title: string, body: string) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<p class="marque"><img src="/brand/logos/lafusee-logo.png" alt="" width="24" height="26">La Fusée</p>
${body}
</main>
</body>
</html>
`;
}

/**
 * `sign-in`: no session; the button opens the existing login with its return.
 * `team`: signed in, but this account's team is not linked to La Barre.
 */
export function barreAccessPage(reason: "sign-in" | "team", input: { login: string; account?: string | null }) {
  const contact = barreAccessContact();
  const name = escapeHtml(contact.name);
  const email = escapeHtml(contact.email);
  const login = escapeHtml(input.login);
  if (reason === "sign-in") {
    const ask = escapeHtml(mailto(contact.email, "Accès à La Barre",
      "Bonjour,\n\nJe souhaite ouvrir La Barre. Pouvez-vous me donner un accès ?\n\nMerci."));
    return pageDocument("Connexion · La Barre", `<h1>Connectez-vous pour ouvrir La Barre.</h1>
<p>La Barre est l’outil de l’agence pour suivre les pièces, leurs versions, les validations et les livraisons. Elle s’ouvre avec votre compte La Fusée.</p>
<p><a class="action" href="${login}">Se connecter avec La Fusée</a></p>
<p class="suite">Pas encore de compte ? <a href="${ask}">Demander l’accès à ${name}</a> (${email}).</p>`);
  }
  const account = input.account?.trim() || null;
  const ask = escapeHtml(mailto(contact.email, "Accès à La Barre",
    `Bonjour,\n\nPouvez-vous rattacher mon compte ${account ?? "La Fusée"} à l’équipe de La Barre ?\n\nMerci.`));
  return pageDocument("Accès à demander · La Barre", `<h1>La Barre n’est pas reliée à votre équipe.</h1>
<p>${account ? `Compte connecté : <strong>${escapeHtml(account)}</strong>. Pour ouvrir La Barre, ce compte` : "Pour ouvrir La Barre, votre compte"} doit être rattaché à l’équipe de l’agence.</p>
<p><a class="action" href="${ask}">Demander l’accès à ${name}</a></p>
<p>Adresse : ${email}. Une fois le compte rattaché, rouvrez simplement ce lien.</p>
<p class="suite"><a href="${login}">Se connecter avec un autre compte</a> · <a href="/portals">Ouvrir mes espaces La Fusée</a></p>`);
}
