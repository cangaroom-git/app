import type { Metadata, Viewport } from "next";
import { Anuphan, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { HotelAppShell } from "@/components/HotelAppShell";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  preload: true,
});

const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-anuphan",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Nondii — โปรเที่ยวไทย แหล่งรวมโปรโมชั่นที่เที่ยวในไทย & จองตรง 0% GP",
  description:
    "Nondii แพลตฟอร์มรวมโปรโมชั่นที่พัก คาเฟ่ ร้านอาหาร บาร์ สปา และกิจกรรมทั่วไทย พร้อมวางแผนทริปและจองห้องพักตรงกับโรงแรม 0% GP",
  icons: {
    icon: [{ url: "/brand/round-icon-blue.svg", type: "image/svg+xml" }],
    shortcut: "/brand/round-icon-blue.svg",
    apple: "/brand/round-icon-blue.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${plusJakartaSans.variable} ${anuphan.variable}`}
      suppressHydrationWarning
    >
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
      <body className="bg-[var(--color-background-body)] text-[var(--color-text-primary)] antialiased selection:bg-[var(--color-accent)]/15">
        <HotelAppShell>{children}</HotelAppShell>
      </body>
    </html>
  );
}
