import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { "*": ["./legacy/**"] },
};

export default nextConfig;
