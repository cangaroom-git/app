import type { Metadata } from "next";
import "./globals.css";
import { HotelAppShell } from "@/components/HotelAppShell";

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
