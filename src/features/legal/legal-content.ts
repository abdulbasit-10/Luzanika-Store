export interface LegalIntro {
  eyebrow: string;
  title: string;
  description: string;
}

export interface LegalBullet {
  label: string;
  text: string;
}

export interface LegalCard {
  title: string;
  text: string;
  icon: "cookie" | "chart";
}

export interface LegalSubsection {
  number: string;
  title: string;
  /** "lg" is the large heading used by 1.1 in the Figma; the others are small. */
  size?: "lg" | "sm";
  /** Accent-coloured heading (1.3 in the Figma). */
  accent?: boolean;
  body: string;
  bullets?: LegalBullet[];
  cards?: LegalCard[];
}

export interface LegalChapter {
  intro: LegalIntro;
  eyebrow: string;
  title: string;
  description: string;
  subsections: LegalSubsection[];
}

/* A neutral banner photo for the legal pages (the FAQ page has its own photo now). */
export const legalHeroImage = {
  src: "/images/faq/hero.jpg",
  alt: "",
  position: "50% 50%",
};

/* The banner photo of the Figma Privacy, Terms and Cookies pages (a cart with a globe, coins and a calculator). */
export const policyHeroImage = {
  src: "/images/legal/privacy-hero.jpg",
  alt: "",
  position: "50% 50%",
};

const welcome: LegalIntro = {
  eyebrow: "Maison Luzanika • Client Charter",
  title: "Welcome to Our Privacy Policy!",
  description:
    "At Luzanika, we respect your privacy and are committed to protecting your personal information. This policy explains how information may be collected, used, and protected when you visit our website or make a purchase.",
};

/*
 * Copied from the Figma "Policy page" frame. The frame repeats the welcome
 * block before Section II, and the 1.3 text ends with "globally:" without a
 * list; both are kept as designed until the client confirms.
 */
export const privacyPolicy = {
  title: "Privacy Policy",
  chapters: [
    {
      intro: welcome,
      eyebrow: "Section I • Data Protocol",
      title: "Privacy Policy And Data Integrity",
      description:
        "Our commitment to safeguarding personal measurements, payment credentials, and navigational telemetry.",
      subsections: [
        {
          number: "1.1",
          title: "Information You Provide Directly",
          size: "lg",
          body: "When engaging with our digital salon, acquiring archival garments, or reserving private fitting appointments at our Rue Saint-Honoré, Madison Avenue, or Ginza ateliers, we gather information voluntarily imparted by you:",
          bullets: [
            {
              label: "Bespoke Fitting Profile & Dimensions:",
              text: "Body measurements, garment silhouette preferences, and tailoring alterations requested during bespoke commissions.",
            },
            {
              label: "Identity & Contact Records:",
              text: "Full legal name, residential address for courier dispatch, private telephone line, and authenticated email address.",
            },
            {
              label: "Financial Transactions:",
              text: "Tokenized payment credentials routed via certified PCI-DSS Level 1 encrypted payment channels (Stripe, Apple Pay, Wire Clearinghouses). We never store raw cardholder verification values (CVV) on Luzanika servers.",
            },
            {
              label: "Concierge Inquiries & Provenance Registrations:",
              text: "Archival authentication requests, bespoke monogram inscriptions, and personal correspondence with our Master Clothiers.",
            },
          ],
        },
        {
          number: "1.2",
          title: "Automatically Collected Telemetry And Cookie Architecture",
          body: "To deliver an effortless, tactile online experience tailored to your device, we utilize strictly essential and performance cookies.",
          cards: [
            {
              title: "Essential Atelier Cookies",
              text: "Mandatory for bag caching, currency selectors, multilingual localization, and encrypted account sessions. Cannot be disabled without interrupting purchase capability.",
              icon: "cookie",
            },
            {
              title: "Editorial Performance Metrics",
              text: "Anonymous session analysis measuring page load performance, collection lookbook interactions, and viewport rendering. Fully anonymized via IP hashing.",
              icon: "chart",
            },
          ],
        },
        {
          number: "1.3",
          title: "Client Privacy Rights (GDPR And CCPA Compliance)",
          accent: true,
          body: "Regardless of your jurisdiction, Luzanika extends the highest standard of European GDPR and Californian CCPA protections globally:",
        },
      ],
    },
    {
      intro: welcome,
      eyebrow: "Section II • Contractual Terms",
      title: "Terms And Conditions of Service",
      description:
        "The governing stipulations determining acquisition, client salon access, and mutual accountability.",
      subsections: [
        {
          number: "2.1",
          title: "Intellectual Property, Trademarks And Haute Couture Patterns",
          body: "All materials showcased across Luzanika—including garment drape patterns, silhouettes, archival photography, typographic typesetting, audio-visual lookbooks, and the Luzanika Monogram Wordmark—are the proprietary intellectual property of Maison Luzanika SAS, protected internationally by the World Intellectual Property Organization (WIPO) and the Institut National de la Propriété Industrielle (INPI).",
        },
        {
          number: "2.2",
          title: "Limitation of Liability And Governing Law",
          body: "These terms are exclusively governed by French Law. In the event of any irreconcilable dispute arising from an online purchase or salon commission, jurisdiction is vested exclusively within the Commercial Court of Paris (Tribunal de Commerce de Paris), without prejudice to mandatory local consumer protection statutes.",
        },
      ],
    },
  ] satisfies LegalChapter[],
};
