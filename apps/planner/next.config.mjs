import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: dir,
  async rewrites() {
    return [
      { source: "/pwa", destination: "/pwa/index.html" },
      { source: "/pwa/", destination: "/pwa/index.html" },
    ];
  },
};

export default nextConfig;
