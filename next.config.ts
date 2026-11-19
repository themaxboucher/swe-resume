import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Headless Chromium must not be bundled; it is loaded at runtime by the PDF route.
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/pdf/[kind]/[id]": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  outputFileTracingExcludes: {
    "/api/pdf/[kind]/[id]": ["./node_modules/puppeteer/**"],
  },
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
