import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: { "*": ["./legacy/**"] },
};

export default nextConfig;
