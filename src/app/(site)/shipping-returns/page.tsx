import type { Metadata } from "next";

import { PageBanner } from "@/components/shared/page-banner";
import { Section } from "@/components/ui/section";
import { legalHeroImage } from "@/features/legal/legal-content";
import { LegalDocument } from "@/features/legal/legal-document";
import { shippingReturns } from "@/features/legal/shipping-returns-content";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description:
    "How Luzanika delivers your order and how returns and refunds work.",
};

export default function ShippingReturnsPage() {
  return (
    <main className="flex-1">
      <PageBanner
        title={shippingReturns.title}
        image={legalHeroImage}
        titleClassName="lg:text-[clamp(2.25rem,3.89vw,3.5rem)]"
        short
      />
      <Section className="lg:pt-[107px] lg:pb-[148px]">
        <LegalDocument chapters={shippingReturns.chapters} />
      </Section>
    </main>
  );
}
