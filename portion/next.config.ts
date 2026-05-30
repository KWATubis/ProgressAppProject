import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcrypt"],
  // Allow phone/LAN testing of the dev server over the local network IP.
  allowedDevOrigins: ["192.168.1.11", "192.168.0.209"],
  // The progress-card image route reads its .ttf fonts from disk at runtime;
  // make sure they're traced into the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/api/progress-card": ["./app/api/progress-card/fonts/**"],
  },
};

export default nextConfig;
