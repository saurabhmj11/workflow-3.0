import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skips type-checking during build for faster deploys
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    ".space-z.ai",
    "localhost",
  ],
};

export default nextConfig;
