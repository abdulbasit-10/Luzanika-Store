import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Section } from "@/components/ui/section";
import { FaqAccordion } from "@/features/faq/faq-accordion";
import { faqItems } from "@/features/faq/faq-items";

export function FaqSection() {
  return (
    <Section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-heading text-3xl leading-tight font-medium sm:text-4xl lg:text-5xl xl:text-[58px]">
          Frequently Asked Questions
        </h2>
        <Link
          href="/contact"
          className="inline-flex items-center gap-3 text-base font-medium text-accent transition-opacity hover:opacity-80 lg:text-2xl"
        >
          Contact Us
          <ArrowRight aria-hidden className="size-5" />
        </Link>
      </div>
      <div className="mt-6 lg:mt-10">
        <FaqAccordion items={faqItems} defaultOpenId="delivery" />
      </div>
    </Section>
  );
}
