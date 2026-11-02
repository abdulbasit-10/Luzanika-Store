import type { Metadata } from "next";

import { PageBanner } from "@/components/shared/page-banner";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { FaqBrowser } from "@/features/faq/faq-browser";
import { faqPage } from "@/features/faq/faq-page-content";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about orders, payments, shipping, returns and products at Luzanika.",
};

export default function FaqPage() {
  return (
    <main className="flex-1">
      <PageBanner
        title={faqPage.hero.title}
        image={faqPage.hero.image}
        titleClassName="lg:text-[clamp(2.25rem,3.89vw,3.5rem)]"
        short
      />
      <Section className="lg:py-25">
        <SectionHeading
          eyebrow={faqPage.eyebrow}
          title={faqPage.title}
          description={faqPage.description}
          titleClassName="max-w-none text-3xl text-black lg:text-[43.5px]"
          contentClassName="gap-5 lg:gap-[23px]"
          descriptionClassName="max-w-[45rem] text-base leading-[1.2] text-muted-foreground lg:text-[18.5px]"
        />
        <div className="mt-8 lg:mt-[46px]">
          <FaqBrowser />
        </div>
      </Section>
    </main>
  );
}
