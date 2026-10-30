import { Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

// Placeholder details copied from the Figma frame; replace with the client's.
export const contactDetails: ContactDetail[] = [
  {
    label: "Mail",
    value: "mdkhan.or@gmail.com",
    icon: Mail,
    href: "mailto:mdkhan.or@gmail.com",
  },
  {
    label: "Phone",
    value: "+923419000933",
    icon: Phone,
    href: "tel:+923419000933",
  },
  { label: "Office", value: "0000 seltice Way Coeur D Alene", icon: MapPin },
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
