import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_BUILD_DIR
    ? { distDir: process.env.NEXT_BUILD_DIR }
    : {}),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
