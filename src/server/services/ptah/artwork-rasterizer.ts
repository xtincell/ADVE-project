/** Rendering and geometry inspection both use the same offline document with scripting disabled. */
import { existsSync } from "node:fs";
import type { Page } from "puppeteer";

async function runStaticPage<T>(
  svg: string,
  width: number,
  height: number,
  read: (page: Page) => Promise<T>,
): Promise<T> {
  const { default: puppeteer } = await import("puppeteer");
  const localChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
    (process.platform === "darwin" && existsSync(localChrome) ? localChrome : undefined);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    timeout: 30_000,
    protocolTimeout: 40_000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--force-color-profile=srgb",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setJavaScriptEnabled(false);
    await page.setOfflineMode(true);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().startsWith("data:")) void request.continue();
      else void request.abort();
    });
    await page.setContent(
      "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'\"><style>html,body{margin:0}svg{display:block}</style>" +
        svg,
      { waitUntil: "load" },
    );
    const embeddedFonts = await page.evaluate(async () => {
      await document.fonts.ready;
      for (const face of Array.from(document.fonts)) {
        if (face.status === "error") throw new Error("Fonte du master illisible.");
      }
      return document.fonts.size;
    });
    if (embeddedFonts) {
      const client = await page.createCDPSession();
      await client.send("DOM.enable");
      await client.send("CSS.enable");
      const { root } = await client.send("DOM.getDocument");
      const { nodeIds } = await client.send("DOM.querySelectorAll", {
        nodeId: root.nodeId,
        selector: "text,tspan",
      });
      for (const nodeId of nodeIds) {
        const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId });
        if (fonts.some((font) => font.glyphCount > 0 && !font.isCustomFont)) {
          throw new Error("Une fonte système s’est substituée à une fonte du master. Le montage doit être relu.");
        }
      }
    }
    return await read(page);
  } finally {
    await browser.close();
  }
}
// A VPS worker can render independent productions without starting concurrent Chromium trees.
let queued = 0;
let last = Promise.resolve();
function readStaticPage<T>(svg: string, width: number, height: number, read: (page: Page) => Promise<T>) {
  if (queued >= 8) {
    return Promise.reject(
      new Error("Le moteur de montage est occupé. Reprenez la production après les rendus en cours."),
    );
  }
  queued++;
  const next = last.then(() => runStaticPage(svg, width, height, read));
  last = next.then(() => undefined, () => undefined);
  return next.finally(() => {
    queued--;
  });
}
export const renderInertSvg = (svg: string, width: number, height: number) =>
  readStaticPage(
    svg,
    width,
    height,
    async (page) => Buffer.from(await page.screenshot({ type: "png", omitBackground: true })),
  );

export function readOverlayZones(svg: string, width: number, height: number, photoLayerId: string) {
  return readStaticPage(svg, width, height, (page) =>
    page.evaluate((slot) => {
      const image = document.getElementById(slot)?.querySelector("image");
      if (!image) throw new Error("Calque photo absent.");
      const panel = image.getBoundingClientRect();
      return Array.from(document.querySelectorAll("text,image")).flatMap((el) => {
        if (el === image || !(image.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) return [];
        const r = el.getBoundingClientRect(),
          left = Math.max(r.left, panel.left),
          top = Math.max(r.top, panel.top);
        const right = Math.min(r.right, panel.right), bottom = Math.min(r.bottom, panel.bottom);
        if (right <= left || bottom <= top) return [];
        // Existing opaque tickets already isolate their text from the background.
        if (
          el.parentElement && Array.from(el.parentElement.children).some((other) => {
            if (other.tagName !== "rect") return false;
            const rr = other.getBoundingClientRect(), style = getComputedStyle(other);
            return rr.left <= left && rr.top <= top && rr.right >= right && rr.bottom >= bottom &&
              style.fill !== "none" && Number(style.fillOpacity) >= 0.95 && Number(style.opacity) >= 0.95;
          })
        ) return [];
        const rgb = getComputedStyle(el).fill.match(/[\d.]+/g)?.slice(0, 3).map(Number);
        const need = el.tagName === "image"
          ? "uni, sans détail concurrent avec la signature"
          : rgb && rgb.length === 3 && (rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722) > 150
          ? "sombre et uniforme derrière les caractères clairs"
          : "clair et uniforme derrière les caractères foncés";
        return [{
          left: Math.floor(100 * (left - panel.left) / panel.width),
          right: Math.ceil(100 * (right - panel.left) / panel.width),
          top: Math.floor(100 * (top - panel.top) / panel.height),
          bottom: Math.ceil(100 * (bottom - panel.top) / panel.height),
          need,
        }];
      });
    }, photoLayerId));
}
