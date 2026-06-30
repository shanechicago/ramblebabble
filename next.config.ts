import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the OG-card fonts are bundled with the route if it runs as a function.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/app/CaveatBrush.ttf", "./src/app/HeavySans.ttf"],
  },
};

export default nextConfig;
