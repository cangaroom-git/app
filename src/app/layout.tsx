import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HotelAppShell } from "@/components/HotelAppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#242526" },
  ],
};

export const metadata: Metadata = {
  title: "Cangaroom — เว็บไซต์และระบบจองที่พักโดยตรงสำหรับโรงแรมและพูลวิลล่า",
  description:
    "Cangaroom แพลตฟอร์มเว็บไซต์และระบบจองห้องพักโดยตรง ใช้งานง่าย ทดลองใช้ฟรี 30 วัน พร้อมระบบล็อกห้องอัตโนมัติ คูปองส่วนลด และผู้ช่วย AI",
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
      <body className="min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)] antialiased selection:bg-[var(--color-accent)]/15">
        <HotelAppShell>{children}</HotelAppShell>
      </body>
    </html>
  );
}
