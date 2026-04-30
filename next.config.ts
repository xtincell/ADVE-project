import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 : reactCompiler stabilized — moved out of `experimental`.
  reactCompiler: true,
  images: {
    // Ptah forge providers + mock fallback domains. Required for next/image
    // to load remote URLs without runtime warnings.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "cdn.freepik.com" },
      { protocol: "https", hostname: "api.freepik.com" },
      { protocol: "https", hostname: "api.magnific.com" },
      { protocol: "https", hostname: "cdn.magnific.com" },
      { protocol: "https", hostname: "commondatastorage.googleapis.com" },
    ],
  },
};

export default nextConfig;
