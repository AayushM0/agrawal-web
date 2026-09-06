import type { Metadata } from "next";
import { Poppins, Noto_Sans_Devanagari, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import TopNavBar from "@/components/layout/TopNavBar";
import MainHeader from "@/components/layout/MainHeader";
import RoyalFooter from "@/components/layout/RoyalFooter";
import CookieBanner from "@/components/layout/CookieBanner";
import OfflineIndicator from "@/components/layout/OfflineIndicator";

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
  metadataBase: new URL("https://www.maharajaagrasenfoundation.com"),
  title: "Maharaja Agrasen Foundation Limited Singapore — One Community • One Platform • One Global Family",
  description: "Connecting Agarwals worldwide in a verified, trusted, and free community platform under Maharaja Agrasen Foundation Limited Singapore.",
  openGraph: {
    title: "Maharaja Agrasen Foundation Limited Singapore",
    description: "Connecting Agarwals worldwide in a verified, trusted, and free community platform under Maharaja Agrasen Foundation Limited Singapore.",
    url: "https://www.maharajaagrasenfoundation.com",
    siteName: "Maharaja Agrasen Foundation Singapore",
    images: [
      {
        url: "/images/logo-square.png",
        width: 500,
        height: 500,
        alt: "Maharaja Agrasen Foundation Limited Singapore Official Logo",
      },
    ],
    locale: "en_SG",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Maharaja Agrasen Foundation Limited Singapore",
    description: "Connecting Agarwals worldwide in a verified, trusted, and free community platform under Maharaja Agrasen Foundation Limited Singapore.",
    images: ["/images/logo-square.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/images/logo-square.png",
  },
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
        <OfflineIndicator />
        <TopNavBar />
        <MainHeader />
        <div className="flex-1">
          {children}
        </div>
        <CookieBanner />
        <RoyalFooter />
      </body>
    </html>
  );
}