import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  outputFileTracingExcludes: {
    "*": [".next/cache/**/*"]
  },
  experimental: {
    webpackBuildWorker: false
  }
};

export default nextConfig;
