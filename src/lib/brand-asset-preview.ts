export function brandAssetPreviewUrl(asset: { id: string; fileUrl: string | null; mimeType: string | null }) {
  if (!asset.fileUrl) return null;
  if (asset.fileUrl === `/api/brand-assets/${asset.id}/original`) return /^image\/(png|jpeg|gif|webp)$/.test(asset.mimeType ?? "") ? `${asset.fileUrl}?preview=1` : null;
  return /\.(png|jpe?g|webp|gif|svg)(?:[?#]|$)/i.test(asset.fileUrl) || asset.fileUrl.startsWith("data:image/") ? asset.fileUrl : null;
}
