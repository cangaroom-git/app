import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HotelAppShell } from "@/components/HotelAppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export const metadata: Metadata = {
  title: "Cangaroom — ค้นหาที่พักสวยทั่วไทย & จองตรงฟรีค่า GP 0%",
  description:
    "Cangaroom แพลตฟอร์มรวมที่พักไทยสไตล์ Pinterest ทั้งภูเขา ทะเล พูลวิลล่า แกลมปิ้ง พร้อมเก็บคูปองส่วนลดและจองห้องพักตรงกับโรงแรม 0% GP",
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
          href="https://res.cloudinary.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)] antialiased selection:bg-[var(--color-accent)]/15">
        <HotelAppShell>{children}</HotelAppShell>
      </body>
    </html>
  );
}
