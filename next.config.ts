import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_BUILD_DIR
    ? { distDir: process.env.NEXT_BUILD_DIR }
    : {}),
  images: {
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
