import type { Metadata } from "next";

import { AboutCtaSection } from "@/features/about/about-cta-section";
import { AboutHero } from "@/features/about/about-hero";
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
    // Figma: a white page between the grey header and footer. The sections set their own colours.
    <main className="flex-1 bg-white">
      <AboutHero />
      <AboutSplitSection {...aboutStory} tone="white" />
      <AboutSplitSection {...aboutMission} tone="cream" imageFirst />
      <GuidingPillarsSection />
      <AboutCtaSection />
    </main>
  );
}
