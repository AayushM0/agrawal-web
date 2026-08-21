import type { Metadata } from "next";
import { Poppins, Noto_Sans_Devanagari, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import TopNavBar from "@/components/layout/TopNavBar";
import MainHeader from "@/components/layout/MainHeader";
import RoyalFooter from "@/components/layout/RoyalFooter";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-devanagari",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maharaja Agrasen Foundation Limited Singapore — One Community • One Platform • One Global Family",
  description: "Connecting Agarwals worldwide in a verified, trusted, and free community platform under Maharaja Agrasen Foundation Limited Singapore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${notoSansDevanagari.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-canvas-page text-body-text antialiased font-sans overflow-x-hidden">
        <TopNavBar />
        <MainHeader />
        <div className="flex-1">
          {children}
        </div>
        <RoyalFooter />
      </body>
    </html>
  );
}