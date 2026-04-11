import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingExcludes: {
    "*": [".next/cache/**/*"]
  },
  experimental: {
    webpackBuildWorker: false
  }
};

export default nextConfig;
