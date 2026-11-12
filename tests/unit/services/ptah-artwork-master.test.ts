// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  artworkPhotoGuide,
  composeArtworkWithLayer,
  inspectArtworkMaster,
} from "@/server/services/ptah/artwork-master";
import { productionArtwork } from "@/domain/production-artwork";
import { selectProvider } from "@/server/services/ptah/routing/provider-selector";

const svgNS = "http://www.w3.org/2000/svg";
const png = await sharp({ create: { width: 24, height: 24, channels: 3, background: "#005ac4" } }).png()
  .toBuffer();
const newPhoto = await sharp({ create: { width: 8, height: 16, channels: 3, background: "#b47a20" } }).png()
  .toBuffer();
const pin = productionArtwork.parse({
  assetId: "fixture-master",
  version: 1,
  originalHash: "a".repeat(64),
  photoLayerId: "scene",
  photoPolicy: "GENERATED_CANDIDATE",
});
function source(height = 1080) {
  return Buffer.from(`<svg xmlns="${svgNS}" width="1080" height="${height}" viewBox="0 0 1080 ${height}">
    <g id="scene" data-production-role="illustration"><image width="1080" height="1080" href="data:image/png;base64,${
    png.toString("base64")
  }"/></g>
    <g id="copy"><text x="40" y="210" font-size="45" fill="#131313">Une copy exacte</text></g>
    <g id="official-logo"><rect x="35" y="15" width="98" height="48" fill="#903020"/></g>
  </svg>`);
}
const rgb = async (b: Buffer, x: number, y: number) =>
  Array.from(
    (await sharp(b).extract({ left: x, top: y, width: 1, height: 1 }).removeAlpha().raw().toBuffer()).subarray(
      0,
      3,
    ),
  );
describe("Montage sur master versionné", () => {
  it("ne propose que le panneau d’illustration et refuse le contenu actif ou externe avant rendu", () => {
    const s = source().toString();
    expect(inspectArtworkMaster(Buffer.from(s))).toMatchObject({
      imageLayers: [{ id: "scene", width: 1080, height: 1080 }],
    });
    for (
      const injection of [
        "<script>alert(1)</script>",
        '<image href="https://fixture.invalid/secret"/>',
        "<style>@import url(https://fixture.invalid)</style>",
        "<foreignObject/>",
        '<g onload="alert(1)"/>',
        '<image href="data:image/png;base64,PHN2Zy8+"/>',
      ]
    ) {
      expect(() => inspectArtworkMaster(Buffer.from(s.replace("</svg>", injection + "</svg>")))).toThrow(
        /Master SVG refusé/,
      );
    }
    expect(() =>
      inspectArtworkMaster(
        Buffer.from(s.replace('data-production-role="illustration"', 'data-production-role="logo"')),
      )
    ).toThrow(/illustration/);
    expect(() => inspectArtworkMaster(Buffer.from(s.replace('id="scene"', 'id="official-logo"')))).toThrow(
      /ambigu/,
    );
  });
  it.each([1080, 1920])(
    "compose le format exact depuis le seul calque prévu, sans modifier la marque · hauteur %i",
    async (height) => {
      const s = source(height);
      const result = await composeArtworkWithLayer(s, pin, newPhoto);
      const metadata = await sharp(result.png).metadata();
      expect([metadata.width, metadata.height]).toEqual([1080, height]);
      expect(result.photoLayer).toBeDefined();
      expect(await rgb(result.png, 999, 800)).toEqual([180, 122, 32]);
      expect(await rgb(result.png, 51, 29)).toEqual([144, 48, 32]);
      const kept = await composeArtworkWithLayer(s, { ...pin, photoPolicy: "LOCKED_MASTER" });
      expect(kept.photoLayer).toBeUndefined();
      expect(await rgb(kept.png, 999, 800)).toEqual([0, 90, 196]);
      expect(await rgb(kept.png, 51, 29)).toEqual([144, 48, 32]);
    },
    90_000,
  );
  it("déduit les zones de calme du master et compose l’original verrouillé sans accès Luna", async () => {
    const guide = await artworkPhotoGuide(source(1920), pin);
    expect(guide.size).toBe("1024x1024");
    expect(guide.zones).toEqual([
      expect.objectContaining({ left: 3, need: "clair et uniforme derrière les caractères foncés" }),
    ]);
    expect(guide.prompt).not.toContain("Une copy exacte");
    expect(guide.prompt).not.toContain("base64");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_TEXT_RELAY_URL", "");
    try {
      const provider = await selectProvider({
        briefText: "Rejouer",
        pillarSource: "D",
        manipulationMode: "facilitator",
        forgeSpec: { kind: "image", parameters: { productionArtwork: { ...pin, photoPolicy: "LOCKED_MASTER" } } },
      });
      expect(provider.name).toBe("master");
    } finally {
      vi.unstubAllEnvs();
    }
  }, 90_000);
});
