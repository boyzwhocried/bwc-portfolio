import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // pin the workspace root: a stray C:\Users\Verrel\package-lock.json makes Turbopack
  // infer the wrong root and warn on every build. this repo is the root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // AVIF disabled (not just de-prioritized): GHSA-2xp9-vwfh-vxw4 is a critical
    // libheif heap-overflow RCE in Next's Image Optimization AVIF decoder, reachable
    // only on sites that opt into "image/avif" here. Upstream's own "fix" (next@16.3.3)
    // is this same disablement, not a real libheif patch -- and 16.3.x has a separate,
    // reproducible build regression in this repo (opengraph-image/sitemap/feed routes
    // throw "Cannot read properties of undefined (reading 'bind')" collecting page data,
    // confirmed on 16.3.0/16.3.3/16.3.5, on both local Windows and Vercel Linux builds).
    // So: mitigate here instead of bumping, stay on 16.2.12 until upstream's build bug
    // is fixed. WebP still covers the browser-negotiation win.
    formats: ["image/webp"],
    // Next 16 restricts arbitrary quality values; whitelist the one we use
    qualities: [70],
    // spotify cover art is effectively immutable per playlist/track, cache hard
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      { protocol: "https", hostname: "**.scdn.co" },      // i.scdn.co, mosaic.scdn.co
      { protocol: "https", hostname: "**.spotifycdn.com" }, // image-cdn-*.spotifycdn.com playlist covers
    ],
  },
};

export default nextConfig;
