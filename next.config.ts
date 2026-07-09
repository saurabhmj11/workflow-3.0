import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TODO: Fix remaining TypeScript errors and remove this flag
    // Current errors are in API route handlers (type mismatches with Request/NextRequest)
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    ".space-z.ai",
    "localhost",
  ],
};

export default nextConfig;
