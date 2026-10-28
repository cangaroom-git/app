import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HotelAppShell } from "@/components/HotelAppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141416" },
  ],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)] antialiased selection:bg-[var(--color-accent)]/15">
        <HotelAppShell>{children}</HotelAppShell>
      </body>
    </html>
  );
}
