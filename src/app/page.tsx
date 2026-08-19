import React from "react";
import HeroSection from "@/components/home/HeroSection";
import SevenPillarsGrid from "@/components/home/SevenPillarsGrid";
import GotraSection from "@/components/home/GotraSection";
import FounderAppeal from "@/components/home/FounderAppeal";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <SevenPillarsGrid />
      <GotraSection />
      <FounderAppeal />
    </main>
  );
}