import type { Metadata } from "next";

import { PageBanner } from "@/components/shared/page-banner";
import { Section } from "@/components/ui/section";
import { cookiesPolicy } from "@/features/cookies/cookie-content";
import { CookiesDocument } from "@/features/cookies/cookies-document";
import { policyHeroImage } from "@/features/legal/legal-content";

export const metadata: Metadata = {
  title: "Cookies Policy",
  description:
    "How Luzanika uses cookies, and how you can manage your cookie preferences.",
};

export default function CookiesPage() {
  return (
    <main className="flex-1">
      <PageBanner
        title={cookiesPolicy.title}
        image={policyHeroImage}
        titleClassName="lg:text-[clamp(2.25rem,3.89vw,3.5rem)]"
      />
      <Section tone="white" className="lg:pt-[107px] lg:pb-[148px]">
        <CookiesDocument />
      </Section>
    </main>
  );
}
