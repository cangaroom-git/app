import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2986D6",
};

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
