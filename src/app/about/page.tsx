import type { Metadata } from "next";

import { AboutCtaSection } from "@/features/about/about-cta-section";
import { AboutHero } from "@/features/about/about-hero";
import { AboutPortfolioSection } from "@/features/about/about-portfolio-section";
import { AboutSplitSection } from "@/features/about/about-split-section";
import { aboutMission, aboutStory } from "@/features/about/about-content";
import { GuidingPillarsSection } from "@/features/about/guiding-pillars-section";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Luzanika brings together fashion and lifestyle essentials for everyday life.",
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <AboutHero />
      <AboutSplitSection {...aboutStory} />
      <AboutSplitSection {...aboutMission} tone="cream" imageFirst />
      <GuidingPillarsSection />
      <AboutPortfolioSection />
      <AboutCtaSection />
    </main>
  );
}
