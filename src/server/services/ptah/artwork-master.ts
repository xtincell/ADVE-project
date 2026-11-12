/** Only this inert, bounded subset of SVG may be used as an editable production master. */
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { MAX_SOURCE_BYTES } from "@/domain/source-original";
import type { ProductionImageReference } from "@/domain/production-image-reference";
import type { ProductionArtwork } from "@/domain/production-artwork";
import { readAssetOriginal } from "@/server/services/brand-vault/original";
import { assertUsablePin } from "@/server/services/deliverable-orchestrator/production-sources";

const svgNS = "http://www.w3.org/2000/svg";
const linkNS = "http://www.w3.org/1999/xlink";
const tags = new Set(
  "svg title desc defs style g image text tspan rect circle path ellipse line polygon polyline linearGradient radialGradient stop mask clipPath"
    .split(" "),
);
const attributes = new Set(
  "id class role aria-labelledby aria-label width height viewBox version x y x1 y1 x2 y2 cx cy r rx ry d points transform preserveAspectRatio text-anchor font-size font-family font-weight font-style letter-spacing fill stroke stroke-width opacity offset stop-color stop-opacity mask maskUnits maskContentUnits clip-path clipPathUnits gradientUnits gradientTransform style href data-production-role"
    .split(" "),
);
const properties = new Set(
  "font-family font-size font-style font-weight letter-spacing fill stroke stroke-width opacity text-anchor".split(
    " ",
  ),
);
const deny = (message: string): never => {
  throw new Error("Master SVG refusé : " + message);
};
const secureUrl = /^url\(#[a-zA-Z_][\w.:-]*\)$/;
const fontBlob = /^data:font\/(otf|ttf);base64,([A-Za-z0-9+/]+={0,2})$/;
const imageBlob = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

function declarations(value: string, allowed: Set<string>) {
  for (const part of value.split(";").filter((s) => s.trim())) {
    const colon = part.indexOf(":");
    const name = part.slice(0, colon).trim(), v = part.slice(colon + 1).trim();
    if (colon < 1 || !allowed.has(name) || !/^[a-zA-Z0-9\s#.,'"%+-]+$/.test(v)) {
      deny("déclaration de style non admise.");
    }
  }
}
function checkCSS(raw: string) {
  let css = raw.replace(/@font-face\s*\{([^{}]*)\}/g, (_match, body: string) => {
    let hasSource = false;
    const simple = body.replace(
      /src\s*:\s*url\("([^"]+)"\)\s+format\("(?:opentype|truetype)"\)\s*;?/g,
      (_declaration, url: string) => {
        const value = fontBlob.exec(url);
        if (!value || hasSource) return deny("une fonte doit être embarquée sans source externe.");
        const bytes = Buffer.from(value[2]!, "base64");
        if (
          bytes.length < 12 || bytes.length > 3_000_000 ||
          (value[1] === "otf" ? bytes.toString("ascii", 0, 4) !== "OTTO" : bytes.readUInt32BE(0) !== 0x10000)
        ) {
          deny("format de fonte embarquée invalide.");
        }
        hasSource = true;
        return "";
      },
    );
    if (!hasSource) deny("fonte sans octets.");
    declarations(simple, new Set(["font-family", "font-style", "font-weight"]));
    return "";
  });
  css = css.replace(
    /(?:^|\s+)([.#a-zA-Z][a-zA-Z0-9_.#, -]*)\s*\{([^{}]*)\}/g,
    (_match, _selector: string, body: string) => {
      declarations(body, properties);
      return "";
    },
  );
  if (css.trim()) deny("feuille de style active ou non prise en charge.");
}

function parseMaster(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_SOURCE_BYTES) deny("taille non admise.");
  const raw = bytes.toString("utf8");
  if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<\?(?!xml\s)/i.test(raw)) {
    deny("entités et instructions externes interdites.");
  }
  const issues: string[] = [];
  const doc = new DOMParser({
    errorHandler: {
      warning: (msg) => issues.push(msg),
      error: (msg) => issues.push(msg),
      fatalError: (msg) => issues.push(msg),
    },
  }).parseFromString(raw, "image/svg+xml");
  const root = doc.documentElement;
  if (issues.length || root.localName !== "svg" || root.namespaceURI !== svgNS) deny("document SVG invalide.");
  const width = Number(root.getAttribute("width")), height = Number(root.getAttribute("height"));
  if (![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 4096) || width * height > 12_000_000) {
    deny("dimensions du master invalides.");
  }
  const all = Array.from(doc.getElementsByTagName("*"));
  if (all.length > 2500) deny("trop d’éléments.");
  const ids = new Set<string>(), images = new Map<string, Element>();
  for (const el of all) {
    if (el.namespaceURI !== svgNS || !tags.has(el.localName)) deny("élément actif ou inconnu.");
    const id = el.getAttribute("id");
    if (id && (ids.has(id) || !/^[a-zA-Z_][\w.:-]{0,119}$/.test(id))) deny("identifiant de calque ambigu.");
    if (id) ids.add(id);
    for (const attr of Array.from(el.attributes)) {
      const key = attr.localName, value = attr.value;
      if (attr.namespaceURI === "http://www.w3.org/2000/xmlns/") {
        if (![svgNS, linkNS].includes(value)) deny("espace de noms inattendu.");
        continue;
      }
      if (
        attr.namespaceURI === "http://www.w3.org/XML/1998/namespace" && key === "space" &&
        ["preserve", "default"].includes(value)
      ) continue;
      if ((attr.namespaceURI && !(key === "href" && attr.namespaceURI === linkNS)) || !attributes.has(key)) {
        deny("attribut non admis.");
      }
      if (key === "href") {
        if (el.localName !== "image" || !imageBlob.test(value)) {
          deny("l’image doit être une ressource raster embarquée.");
        }
      } else if (key === "style") declarations(value, properties);
      else if (
        /[\\@\u0000-\u0008<>]/.test(value) ||
        (/[():]/.test(value) && !secureUrl.test(value) &&
          !(key === "transform" &&
            /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([-+0-9eE.,\s]+\)\s*)+$/.test(value)) &&
          key !== "id")
      ) deny("référence ou attribut actif interdit.");
    }
    if (el.localName === "image") {
      const embedded = Array.from(el.attributes).filter((a) => a.localName === "href");
      if (embedded.length !== 1) deny("chaque image doit avoir une source unique.");
      const match = imageBlob.exec(embedded[0]!.value);
      if (!match) deny("raster absent.");
      const data = Buffer.from(match![2]!, "base64");
      const actual = data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
        ? "png"
        : data.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))
        ? "jpeg"
        : data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP"
        ? "webp"
        : null;
      if (actual !== match![1]) deny("le type annoncé ne correspond pas au raster embarqué.");
    }
    if (el.localName === "style") checkCSS(el.textContent ?? "");
    if (
      el.localName === "g" && id &&
      (el.getAttribute("data-production-role") === "illustration" || id === "food-photography")
    ) {
      // Each editable slot owns exactly one image. A logo, footer or text group is never eligible.
      const child = Array.from(el.childNodes).filter((n) => n.nodeType === 1) as Element[];
      if (child.length === 1 && child[0]!.localName === "image" && !(id.match(/logo|footer|signature/i))) {
        images.set(id, child[0]!);
      }
    }
  }
  const imageLayers = Array.from(
    images,
    ([id, image]) => ({
      id,
      width: Number(image.getAttribute("width")),
      height: Number(image.getAttribute("height")),
    }),
  );
  if (
    !imageLayers.length ||
    imageLayers.some((l) => ![l.width, l.height].every((n) => Number.isInteger(n) && n > 0 && n <= 4096))
  ) deny("aucun calque d’illustration exploitable.");
  return { doc, images, inspection: { width, height, imageLayers } };
}

export function inspectArtworkMaster(svg: Buffer) {
  return parseMaster(svg).inspection;
}

export async function readArtworkMaster(
  scope: { strategyId: string; operatorId: string; campaignId?: string | null },
  pin: ProductionImageReference,
) {
  const asset = await db.brandAsset.findFirst({
    where: {
      id: pin.assetId,
      strategyId: scope.strategyId,
      OR: [{ operatorId: scope.operatorId }, { operatorId: null }],
    },
  });
  if (!asset) throw new Error("Master inaccessible dans cette marque.");
  assertUsablePin(asset, { ...pin, role: "MATERIAL" }, scope.campaignId ?? undefined);
  const meta = z.object({
    original: z.object({
      state: z.literal("STORED"),
      contentHash: z.literal(pin.originalHash),
      byteLength: z.number().int().positive().max(MAX_SOURCE_BYTES),
    }),
  }).safeParse(asset.metadata);
  if (!meta.success || asset.mimeType !== "image/svg+xml") {
    throw new Error("Le master doit être un original SVG conservé de cette version.");
  }
  const original = await readAssetOriginal(asset.id);
  if (
    !original || original.receipt.fileType !== asset.mimeType ||
    original.receipt.contentHash !== pin.originalHash || original.bytes.length !== meta.data.original.byteLength ||
    createHash("sha256").update(original.bytes).digest("hex") !== pin.originalHash
  ) throw new Error("Le master a changé depuis la sélection.");
  return { bytes: original.bytes, inspection: inspectArtworkMaster(original.bytes) };
}

/** The requested image alone changes. Editable type, chroma, logo and other resources are taken from the signed master. */
export async function composeArtworkWithLayer(
  original: Buffer,
  slot: Pick<ProductionArtwork, "photoLayerId" | "photoPolicy">,
  photo?: Buffer,
) {
  const { doc, images, inspection } = parseMaster(original), layer = images.get(slot.photoLayerId);
  if (!layer) throw new Error("Le calque d’illustration sélectionné n’existe pas dans cette version.");
  let photoLayer: Buffer | undefined;
  if (slot.photoPolicy === "GENERATED_CANDIDATE") {
    if (!photo?.length || photo.length > 25_000_000) {
      throw new Error("La nouvelle photo est absente ou trop volumineuse.");
    }
    // Inspection of a signed master needs only XML, not a native raster engine.
    const { default: sharp } = await import("sharp");
    const raster = sharp(photo, { limitInputPixels: 30_000_000, failOn: "warning" });
    const info = await raster.metadata();
    if (!["jpeg", "png", "webp"].includes(info.format ?? "")) {
      throw new Error("La nouvelle illustration doit être un raster lisible.");
    }
    const normalized = await raster.rotate().resize(
      Number(layer.getAttribute("width")),
      Number(layer.getAttribute("height")),
      { fit: "cover" },
    ).png().toBuffer();
    photoLayer = normalized;
    const href = "data:image/png;base64," + normalized.toString("base64");
    if (layer.hasAttributeNS(linkNS, "href")) layer.setAttributeNS(linkNS, "xlink:href", href);
    else layer.setAttribute("href", href);
  }
  const { renderInertSvg } = await import("./artwork-rasterizer");
  const svg = new XMLSerializer().serializeToString(doc.documentElement);
  return { png: await renderInertSvg(svg, inspection.width, inspection.height), photoLayer };
}

export async function composeArtworkMaster(
  original: Buffer,
  slot: Pick<ProductionArtwork, "photoLayerId" | "photoPolicy">,
  photo?: Buffer,
) {
  return (await composeArtworkWithLayer(original, slot, photo)).png;
}

/** Only geometry and contrast enter the photo prompt, never the private SVG, artwork text or font bytes. */
export async function artworkPhotoGuide(original: Buffer, slot: ProductionArtwork) {
  const { doc, inspection } = parseMaster(original);
  const layer = inspection.imageLayers.find((l) => l.id === slot.photoLayerId);
  if (!layer) throw new Error("Calque photo absent du master.");
  const { readOverlayZones } = await import("./artwork-rasterizer");
  const zones = await readOverlayZones(
    new XMLSerializer().serializeToString(doc.documentElement),
    inspection.width,
    inspection.height,
    slot.photoLayerId,
  );
  const geometry = zones.map((z) => `x ${z.left}–${z.right} %, y ${z.top}–${z.bottom} % : fond ${z.need}`).join(
    "\n",
  );
  const prompt =
    `Photo seule pour un cadre de ${layer.width} × ${layer.height}. Aucun texte, logo, insigne, ticket ni icône dans les pixels générés. Ces éléments sont ajoutés ensuite par le master. Les coordonnées partent du coin supérieur gauche de la PHOTO après cadrage. Garder chaque zone indiquée calme, sans couvert brillant ni texture contrastée sous les lettres ; placer les éléments visuels importants dans les espaces libres.\n${geometry}`;
  const ratio = layer.width / layer.height;
  return { prompt, size: ratio > 1.2 ? "1536x1024" : ratio < 0.83 ? "1024x1536" : "1024x1024", zones };
}
