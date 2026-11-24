import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must load from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  cacheComponents: true,
  experimental: {
    // CSV imports are sent to a Server Action as text (capped at 3.5 MB in the app).
    serverActions: { bodySizeLimit: "4mb" },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
