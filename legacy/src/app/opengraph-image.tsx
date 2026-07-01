import { ImageResponse } from "next/og";

// OG image par défaut — générée (1200×630), aux couleurs UPgraders DS (panda
// noir/bone + corail #E56458 + or #FACC15). Sert openGraph + twitter card sitewide.
// Polices système (sans-serif) pour rester robuste en serverless (pas de fetch font).
export const alt = "La Fusée — Industry OS du marché créatif africain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d0d0d",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#E56458" }} />
          <span style={{ color: "#f5f1e8", fontSize: 34, fontWeight: 700 }}>La Fusée</span>
          <span style={{ color: "#8a8578", fontSize: 22, marginLeft: 8 }}>by UPgraders</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span style={{ color: "#ffffff", fontSize: 68, fontWeight: 800, lineHeight: 1.05, maxWidth: 920 }}>
            L&apos;Industry OS du marché créatif africain
          </span>
          <span style={{ color: "#E56458", fontSize: 30, fontWeight: 600 }}>
            Transformer les marques en icônes culturelles
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#FACC15", fontSize: 24, fontWeight: 600 }}>Méthode ADVE / RTIS</span>
          <span style={{ color: "#8a8578", fontSize: 24 }}>· lafusee.app</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
