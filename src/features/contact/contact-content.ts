import { Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { siteConfig } from "@/config/site";

export const contactHero = {
  title: "Contact Us",
  image: {
    src: "/images/contact/hero.jpg",
    alt: "",
    position: "50% 50%",
  },
};

export const contactIntro = {
  title: "Get in touch",
  description:
    "We're here for you every step of the way, whether you have questions, need order assistance, or want to share feedback, our friendly customer support team is ready to assist. Our team is here to help! Reach out to us via",
};

export interface ContactDetail {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Makes the value a mailto:/tel: link. */
  href?: string;
}

// The shop's real details, shared with the footer through siteConfig.
export const contactDetails: ContactDetail[] = [
  {
    label: "Mail",
    value: siteConfig.contact.email,
    icon: Mail,
    href: `mailto:${siteConfig.contact.email}`,
  },
  {
    label: "Phone",
    value: siteConfig.contact.customerService.phone,
    icon: Phone,
    href: `tel:${siteConfig.contact.customerService.phone.replace(/[^\d+]/g, "")}`,
  },
  { label: "Office", value: siteConfig.contact.address, icon: MapPin },
];

export const contactSocial = { title: "Stay Connected" };

export const contactForm = {
  title: "Send us a message",
  description:
    "Your email address will not be published. Required fields are marked",
  submitLabel: "Submit",
  // Not in Figma: shown after a successful or failed submit.
  successMessage: "Thank you for reaching out. We'll get back to you soon.",
  errorMessage: "Something went wrong. Please try again.",
};
