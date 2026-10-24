import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HotelAppShell } from "@/components/HotelAppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "my-hotel · Sapan Unseen — ระบบเว็บไซต์และจองที่พักโดยตรงสำหรับโรงแรม",
  description:
    "my-hotel แพลตฟอร์มเว็บไซต์และระบบจองห้องพักโดยตรงยุคใหม่ พร้อม AI Concierge, จัดการห้องพัก โปรโมชั่น คูปอง และเรทราคาตามฤดูกาล",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <meta
          name="theme-color"
          content="#ffffff"
          id="my-hotel-theme-color"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("my-hotel-theme");var d=t==="dark";var c=d?"#1C1C1D":"#ffffff";document.documentElement.classList.toggle("dark",d);document.documentElement.style.backgroundColor=c;document.documentElement.style.colorScheme=d?"dark":"light";var m=document.getElementById("my-hotel-theme-color");if(m)m.setAttribute("content",c);}catch(e){}})();`,
          }}
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
      <body
        className="min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)] antialiased selection:bg-[var(--color-accent)]/15"
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
