import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server accept requests from other devices on the same
  // network (e.g. testing on a phone via http://<your-computer-ip>:3000).
  allowedDevOrigins: ["192.168.1.7"],
};

export default nextConfig;
