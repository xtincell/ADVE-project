import { createHash } from "node:crypto";
import { Script } from "node:vm";
import { JSDOM } from "jsdom";
import type { BarreBrandContext } from "@/domain/barre-brand-context";
import { barreFileUrl } from "@/domain/portfolio-barre";
import { barreUpstreamUrl } from "./barre-connection";

export type BarreDocumentKind = "cadrage" | "conception" | "production" | "presentation";
type Bundle = { hash: string; scripts: Script[]; styles: string[] };
let bundle: Bundle | undefined;

async function nativeFile(path: string, hash?: string) {
  const response = await fetch(barreUpstreamUrl(path.split("/")), {
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok || (hash && response.headers.get("x-la-barre-runtime") !== hash))
    throw new Error("Le moteur de document n’a pas pu être reçu à une seule version.");
  return response;
}

/** Native code is trusted installation code; source documents are never evaluated. */
export async function readBarreDocumentRuntime(): Promise<Bundle> {
  const response = await nativeFile("index.html");
  const hash = response.headers.get("x-la-barre-runtime");
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) throw new Error("La version du moteur de document n’est pas disponible.");
  if (bundle?.hash === hash) return bundle;
  const index = await response.text();
  const files = [...index.matchAll(/<script src="(app\/[a-zA-Z0-9_-]+\.js)"><\/script>/g)]
    .map((m) => m[1]!).filter((f) => f !== "app/application.js");
  const styles = [...index.matchAll(/<link rel="stylesheet" href="(styles\/[a-zA-Z0-9_-]+\.css)"/g)].map((m) => m[1]!);
  if (!files.includes("app/compilateur.js") || !files.includes("app/partage.js") || !styles.length)
    throw new Error("Le moteur de document natif est incomplet.");
  const scripts = await Promise.all(files.map(async (file) =>
    new Script(await (await nativeFile(file, hash)).text(), { filename: file })));
  bundle = { hash, scripts, styles };
  return bundle;
}

const MEDIA = /\.(?:png|jpe?g|webp|gif|svg|mp4|webm|pdf)$/i;
export function sharedMediaPath(raw: string): string | null {
  if (!raw || raw.includes("\\") || /[%\u0000-\u001f\u007f]/.test(raw)) return null;
  const rel = raw.replace(/^\/la-barre\//, "");
  if (!MEDIA.test(rel) || !barreFileUrl(rel)) return null;
  return rel;
}

/** Parse without script execution; retain only a document and explicit media. */
export function cleanBarreDocument(html: string) {
  const dom = new JSDOM(`<main>${html}</main>`);
  try {
    const root = dom.window.document.querySelector("main")!;
    const tags = new Set("MAIN HEADER FOOTER ARTICLE SECTION ASIDE DIV SPAN P BR HR H1 H2 H3 H4 H5 H6 A IMG VIDEO AUDIO SOURCE TABLE THEAD TBODY TFOOT TR TH TD CAPTION COLGROUP COL DETAILS SUMMARY FIGURE FIGCAPTION BLOCKQUOTE CODE PRE STRONG EM B I U S SMALL SUP SUB DL DT DD UL OL LI TIME".split(" "));
    root.querySelectorAll("*").forEach((e) => { if (!tags.has(e.tagName)) e.remove(); });
    const media = new Set<string>();
    for (const element of root.querySelectorAll("*")) {
      for (const attribute of [...element.attributes]) {
        const key = attribute.name.toLowerCase();
        if (key.startsWith("on") || ["srcdoc", "srcset", "action", "formaction", "ping", "nonce", "is"].includes(key) ||
            (key === "style" && /url\s*\(|expression\s*\(|@import/i.test(attribute.value))) element.removeAttribute(attribute.name);
      }
      for (const key of ["src", "poster", "href"]) {
        const value = element.getAttribute(key);
        if (!value) continue;
        if (key !== "href" && /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=\s]+$/.test(value)) continue;
        if (key === "href" && value.startsWith("#")) continue;
        // A second sanitizing pass receives the already normalized relative path.
        let decoded = value;
        try { if (value.startsWith("media/")) decoded = decodeURIComponent(value.slice(6)); }
        catch { decoded = ""; }
        const rel = sharedMediaPath(decoded);
        if (rel) {
          media.add(rel); element.setAttribute(key, `media/${rel.split("/").map(encodeURIComponent).join("/")}`);
        } else if (key === "href" && /^https:\/\//.test(value)) {
          try {
            const url = new URL(value);
            if (url.username || url.password) throw new Error("credentialed address");
            element.setAttribute("rel", "noopener noreferrer"); element.setAttribute("target", "_blank");
          } catch { element.removeAttribute(key); }
        } else {
          element.removeAttribute(key);
          if (key === "src") element.setAttribute("alt", element.getAttribute("alt") || "Média conservé dans le dossier de travail");
        }
      }
    }
    return { html: root.innerHTML, mediaPaths: [...media].sort() };
  } finally { dom.window.close(); }
}

/** Same native compiler/builders, transient native depot, no remote writes or network. */
export function compileBarreDocument(runtime: Bundle, data: unknown, projectId: string, doc: BarreDocumentKind, context: BarreBrandContext) {
  const serialized = JSON.stringify(data);
  const dom = new JSDOM('<!doctype html><html lang="fr"><body><main id="corps"></main></body></html>', {
    url: "https://native.invalid/la-barre/index.html", runScripts: "outside-only", storageQuota: serialized.length + 1_000_000,
  });
  try {
    const win = dom.window;
    win.fetch = () => { throw new Error("Le compilateur de document ne fait pas de requête réseau."); };
    Object.defineProperty(win, "XMLHttpRequest", { value: undefined });
    win.localStorage.setItem("la-barre", serialized);
    for (const script of runtime.scripts) script.runInContext(dom.getInternalVMContext(), { timeout: 1_000 });
    if (!win.DEPOT.charger()) throw new Error("Le dossier natif n’a pas pu être relu.");
    win.VAULT.connecter(context);
    const project = win.DEPOT.trouve("projets", projectId);
    const share = project?.partages?.[doc];
    if (!share) throw new Error("Le document n’a pas de lien publié.");
    const root = win.document.getElementById("corps")!;
    win.PARTAGE.page(root, share.jeton);
    const cleaned = cleanBarreDocument(root.innerHTML);
    return { ...cleaned, stylePaths: runtime.styles, codeRevision: runtime.hash,
      documentDigest: createHash("sha256").update(cleaned.html).digest("hex") };
  } finally { dom.window.close(); }
}
