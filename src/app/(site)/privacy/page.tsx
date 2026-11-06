import type { Metadata } from "next";

import { PageBanner } from "@/components/shared/page-banner";
import { Section } from "@/components/ui/section";
import { LegalDocument } from "@/features/legal/legal-document";
import {
  privacyHeroImage,
  privacyPolicy,
} from "@/features/legal/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Luzanika collects, uses and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1">
      <PageBanner
        title={privacyPolicy.title}
        image={privacyHeroImage}
        titleClassName="lg:text-[clamp(2.25rem,3.89vw,3.5rem)]"
      />
      <Section tone="white" className="lg:pt-[107px] lg:pb-[148px]">
        <LegalDocument chapters={privacyPolicy.chapters} />
      </Section>
    </main>
  );
}
