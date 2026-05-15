import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cms.chat-admin.online",
      },
      {
        protocol: "https",
        hostname: "highendshow.ae",
      },
    ],
  },
};

export default nextConfig;
