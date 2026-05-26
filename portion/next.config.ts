import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcrypt"],
  // Allow phone/LAN testing of the dev server over the local network IP.
  allowedDevOrigins: ["192.168.1.11", "192.168.0.209"],
};

export default nextConfig;
