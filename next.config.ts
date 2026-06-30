import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the OG-card fonts are bundled with the route if it runs as a function.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/app/CaveatBrush.ttf", "./src/app/HeavySans.ttf"],
  },
  // Make every device always pull the LATEST app. The page HTML must revalidate
  // on each load (no-cache) so a browser never serves a stale build that points
  // at old chunks. The content-hashed assets under /_next/ keep their immutable
  // long cache (excluded below) so this costs nothing in speed.
  async headers() {
    return [
      {
        source: "/((?!_next/).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
