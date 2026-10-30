import { Headset, Shirt, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const aboutHeroImage = {
  src: "/images/about/hero.jpg",
  alt: "",
  position: "65% 20%",
};

export const aboutHero = {
  titleLines: ["More Than Fashion.", "A Way of Life"],
  description:
    "Discover a world of timeless style, everyday essentials, and thoughtful details designed to complement your lifestyle",
  cta: { label: "Explore Our Collection", href: "/products" },
};

export const aboutStory = {
  eyebrow: "Our Story",
  title: "The Story Behind Luzanika",
  description:
    "Luzanika brings together fashion and lifestyle essentials for different moments in everyday life. Our goal is to make exploring your personal style simple, enjoyable, and inspiring, with a collection designed to suit a variety of tastes and occasions.",
  image: {
    src: "/images/about/story.jpg",
    alt: "A woman arranging fabric swatches on a wooden table",
    position: "50% 30%",
  },
};

export const aboutMission = {
  eyebrow: "Our Mission",
  title: "Style for Every Day",
  description:
    "Our mission is to offer a convenient shopping experience where customers can discover clothing, bags, fragrances, and lifestyle essentials in one place.",
  image: {
    src: "/images/about/mission.jpg",
    alt: "Folded knitwear on a wooden table in a sunlit boutique",
    position: "50% 60%",
  },
};

export interface Pillar {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const aboutPillars = {
  eyebrow: "Guiding Pillars",
  title: "Crafted with Purpose, Guided by Care",
  items: [
    {
      title: "Personal Style",
      description: "Products to complement different styles and occasions.",
      icon: Shirt,
    },
    {
      title: "Easy Shopping",
      description: "A straightforward way to explore and shop our collections.",
      icon: ShoppingBag,
    },
    {
      title: "Customer Focus",
      description: "A shopping experience designed around customer needs.",
      icon: Headset,
    },
  ] satisfies Pillar[],
};

export const aboutPortfolio = {
  eyebrow: "Portfolio Repertoire",
  title: "Find Your Everyday Essentials",
};

export const aboutCta = {
  title: "Your Style, Your Story.",
  description:
    "Explore the Luzanika collection and find pieces that feel right for you.",
  primary: { label: "Shop now", href: "/products" },
  secondary: { label: "Book styling consultation", href: "/contact" },
  image: {
    src: "/images/about/cta.jpg",
    alt: "A beige backpack and luggage in soft light",
    position: "50% 40%",
  },
};
