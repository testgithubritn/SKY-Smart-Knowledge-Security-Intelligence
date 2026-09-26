import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Disable the Next.js dev tools overlay (the "Open Next.js Dev Tools" button)
  devIndicators: false,
};

export default nextConfig;
