import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Pin the workspace root so Turbopack doesn't walk up to a parent
    // directory that happens to contain a lockfile.
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
