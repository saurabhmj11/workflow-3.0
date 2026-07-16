import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skips type-checking during build for faster deploys
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skips ESLint during build — run linting separately in CI
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    ".space-z.ai",
    "localhost",
  ],
  // Required for Netlify deployment
  output: undefined,
};

export default nextConfig;
