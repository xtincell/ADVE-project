/** Explicit multimodal routing; a text fallback must never silently discard frames. */
export interface GatewayImage { bytes: Uint8Array; mediaType: "image/jpeg" | "image/png" }
export function validateGatewayImages(images?: readonly GatewayImage[]) {
  if (images === undefined) return;
  if (!images.length || images.length > 8 || images.some(i => !["image/jpeg", "image/png"].includes(i.mediaType) || !i.bytes.length || i.bytes.length > 1_000_000) || images.reduce((s, i) => s + i.bytes.length, 0) > 4_000_000) throw new Error("Images multimodales hors limites.");
  for (const i of images) {
    const png = i.bytes[0] === 137 && i.bytes[1] === 80 && i.bytes[2] === 78 && i.bytes[3] === 71;
    const jpg = i.bytes[0] === 255 && i.bytes[1] === 216 && i.bytes[2] === 255;
    if (i.mediaType === "image/png" ? !png : !jpg) throw new Error("Signature image invalide.");
  }
}
export function visionConfiguration(): { provider: "anthropic" | "ollama" | "openrouter"; model: string } | null {
  const provider = process.env.LLM_VISION_PROVIDER;
  const model = process.env.LLM_VISION_MODEL?.trim();
  if (!(provider === "anthropic" || provider === "ollama" || provider === "openrouter") || !model) return null;
  return { provider, model };
}
