import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< HEAD
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
=======
  outputFileTracingRoot: undefined, // Disables file tracing to avoid workspace inference issues
>>>>>>> 7391bf5 (Modernize Ramani frontend: community app with interactive emergency response UI and planner app with dark-themed climate dashboard)
};

export default nextConfig;
