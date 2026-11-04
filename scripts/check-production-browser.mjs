/** Image-build smoke test in the final standalone image, as its runtime user. */
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import puppeteer from "puppeteer";
const paths = [
  ...(process.argv[2] ? [process.argv[2]] : []),
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
];
let font;
for (const path of paths) {
  try {
    font = await readFile(path);
    break;
  } catch {}
}
assert(font, "The installed Liberation font was not found");
await access(process.env.PUPPETEER_EXECUTABLE_PATH);
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-background-networking"],
});
try {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setOfflineMode(true);
  await page.setViewport({ width: 128, height: 64, deviceScaleFactor: 1 });
  await page.setContent(
    `<style>body{margin:0}@font-face{font-family:Fixture;src:url("data:font/ttf;base64,${
      font.toString("base64")
    }") format("truetype")}</style><svg width="128" height="64"><text x="2" y="32" style="font: 22px Fixture">Épreuve</text></svg>`,
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const client = await page.createCDPSession();
  await client.send("DOM.enable");
  await client.send("CSS.enable");
  const { root } = await client.send("DOM.getDocument");
  const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: "text" });
  const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId });
  assert(fonts.some((f) => f.isCustomFont && f.glyphCount > 0), "Chromium substituted the embedded font");
  const bytes = Buffer.from(await page.screenshot({ type: "png" }));
  assert.equal(bytes.readUInt32BE(16), 128);
  assert.equal(bytes.readUInt32BE(20), 64);
  console.log("Chromium rendered an offline SVG using its embedded font.");
} finally {
  await browser.close();
}
