import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // pin the workspace root: a stray C:\Users\Verrel\package-lock.json makes Turbopack
  // infer the wrong root and warn on every build. this repo is the root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // browser-negotiated: AVIF preferred, WebP fallback, original last
    formats: ["image/avif", "image/webp"],
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
