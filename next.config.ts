import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
