import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: undefined, // Disables file tracing to avoid workspace inference issues
};

export default nextConfig;
