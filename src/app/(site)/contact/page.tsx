import type { Metadata } from "next";

import { PageBanner } from "@/components/shared/page-banner";
import { contactHero } from "@/features/contact/contact-content";
import { ContactSection } from "@/features/contact/contact-section";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Questions, order assistance or feedback? Get in touch with the Luzanika team.",
};

export default function ContactPage() {
  return (
    <main className="flex-1">
      <PageBanner
        title={contactHero.title}
        image={contactHero.image}
        titleClassName="lg:text-[clamp(2.25rem,3.89vw,3.5rem)]"
      />
      <ContactSection />
    </main>
  );
}
