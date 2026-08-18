import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence the webpack/turbopack warning
  turbopack: {},
  serverExternalPackages: ["mongoose", "mongodb", "bson"],
  experimental: {
    serverComponentsExternalPackages: ["mongoose", "mongodb", "bson"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent server-only modules from being bundled on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        dgram: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
