import type { Metadata } from "next";
import React from "react";
import FounderContent from "@/components/founder/FounderContent";

export const metadata: Metadata = {
  title: "Sohan Lal Jindal (सोहनलाल जिंदल), Founder and Chairman, Maharaja Agrasen Foundation Limited, Singapore",
  description:
    'Sohan Lal Jindal "Singapore Wale" is Founder and Chairman of Maharaja Agrasen Foundation Limited, Singapore. Contact: +65 9277 4444, contact@maharajaagrasenfoundation.com',
  alternates: {
    canonical: "https://www.maharajaagrasenfoundation.com/sohan-lal-jindal/",
  },
  openGraph: {
    title: "Sohan Lal Jindal (सोहनलाल जिंदल) — Founder & Chairman",
    description:
      'Sohan Lal Jindal "Singapore Wale" is Founder and Chairman of Maharaja Agrasen Foundation Limited, Singapore. One Community • One Platform • One Global Family.',
    url: "https://www.maharajaagrasenfoundation.com/sohan-lal-jindal/",
    siteName: "Maharaja Agrasen Foundation Limited, Singapore",
    images: [
      {
        url: "/images/sohan-lal-jindal-singapore.jpg",
        width: 640,
        height: 641,
        alt: "Sohan Lal Jindal (सोहनलाल जिंदल), Founder and Chairman of Maharaja Agrasen Foundation Limited, Singapore",
      },
    ],
    locale: "en_SG",
    type: "profile",
  },
  twitter: {
    card: "summary",
    title: "Sohan Lal Jindal — Founder & Chairman, Maharaja Agrasen Foundation Singapore",
    description:
      'Sohan Lal Jindal "Singapore Wale" leads Maharaja Agrasen Foundation Limited, Singapore. Contact: +65 9277 4444.',
    images: ["/images/sohan-lal-jindal-singapore.jpg"],
  },
};

export default function FounderPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Sohan Lal Jindal",
    alternateName: [
      "Sohanlal Jindal",
      'Sohan Lal Jindal "Singapore Wale"',
      'Sohanlal Jindal "Singapur Wale"',
      "सोहनलाल जिंदल",
    ],
    jobTitle: "Founder & Chairman",
    worksFor: {
      "@type": "Organization",
      name: "Maharaja Agrasen Foundation Limited, Singapore",
      url: "https://www.maharajaagrasenfoundation.com/",
      identifier: "UEN 202551557G",
      foundingDate: "2025-11-20",
    },
    url: "https://www.maharajaagrasenfoundation.com/sohan-lal-jindal/",
    image: "https://www.maharajaagrasenfoundation.com/images/sohan-lal-jindal-singapore.jpg",
    telephone: "+6592774444",
    email: "contact@maharajaagrasenfoundation.com",
    nationality: {
      "@type": "Country",
      name: "Indian",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "Singapore",
    },
    sameAs: [
      "https://www.facebook.com/profile.php?id=61591383791239",
      "https://www.instagram.com/sohanlal_jindal_singapore_wale/",
    ],
    award: [
      "Maharaja Agrasen Global Icon Award 2026",
    ],
    description: "community leader and social worker serving the global Agarwal community from Singapore",
  };

  return (
    <main className="min-h-screen bg-canvas-page">
      {/* Schema.org Person JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FounderContent photoSrc="/images/sohan-lal-jindal-singapore.jpg" />
      </div>
    </main>
  );
}
