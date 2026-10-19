import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen bg-[#F6F8FB] text-[#121317] antialiased selection:bg-[#0063F5]/15 selection:text-[#0063F5]"
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Anuphan', sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
