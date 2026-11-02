import type { Metadata } from "next";

import { PageBanner } from "@/components/shared/page-banner";
import { Section } from "@/components/ui/section";
import { legalHeroImage } from "@/features/legal/legal-content";
import { TermsDocument } from "@/features/legal/terms-document";
import { termsConditions } from "@/features/legal/terms-content";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "The rules and guidelines for using the Luzanika website and purchasing our products.",
};

export default function TermsPage() {
  return (
    <main className="flex-1">
      <PageBanner
        title={termsConditions.title}
        image={legalHeroImage}
        titleClassName="lg:text-[clamp(2.25rem,3.89vw,3.5rem)]"
        short
      />
      <Section className="lg:pt-25 lg:pb-[102px]">
        <TermsDocument content={termsConditions} />
      </Section>
    </main>
  );
}
