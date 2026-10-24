import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { HotelAppShell } from "@/components/HotelAppShell";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "my-hotel · Sapan Unseen — ระบบเว็บไซต์และจองที่พักโดยตรงสำหรับโรงแรม",
  description:
    "my-hotel แพลตฟอร์มเว็บไซต์และระบบจองห้องพักโดยตรงยุคใหม่ พร้อม AI Concierge, จัดการห้องพัก โปรโมชั่น คูปอง และเรทราคาตามฤดูกาล",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("my-hotel-theme");document.documentElement.classList.toggle("dark",t==="dark");}catch(e){}})();`,
          }}
        />
        <link
          rel="preconnect"
          href="https://images.unsplash.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://assets.mixkit.co"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${notoSansThai.className} min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)] antialiased selection:bg-[var(--color-accent)]/15`}
        style={{
          fontFamily:
            '"Segoe UI Historic", "Segoe UI", Helvetica, Arial, sans-serif',
        }}
      >
        <HotelAppShell>{children}</HotelAppShell>
      </body>
    </html>
  );
}
