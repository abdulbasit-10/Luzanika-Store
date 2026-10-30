export interface TermsSection {
  number: string;
  title: string;
  /** "lg" is the large regular-weight heading Figma uses from section 3 on. */
  size: "sm" | "lg";
  body?: string;
  items?: string[];
}

/*
 * Copied from the Figma "Term and conditions" frame. The last bullet of
 * section 2 repeats in section 3, as in the design; kept until the client
 * confirms.
 */
export const termsConditions = {
  title: "Terms and Conditions",
  eyebrow: "Maison Luzanika • Client Charter",
  heading: "Terms And Conditions",
  description:
    "Please read these terms carefully before using our website or placing an order with the atelier.",
  welcome: {
    title: "Welcome to Luzanika!",
    description:
      "Thank you for visiting Luzanika. These Terms & Conditions explain the rules and guidelines for accessing and using our website and purchasing our archival and bespoke couture products.",
  },
  sections: [
    {
      number: "1.",
      title: "Acceptance of Terms",
      size: "sm",
      body: "By accessing or using the Luzanika website, you agree to comply with these Terms & Conditions. If you do not agree with these terms, please do not use our website.",
    },
    {
      number: "2.",
      title: "Website Usage",
      size: "sm",
      items: [
        "You agree to use our website for lawful purposes.",
        "You must provide accurate information when creating an account or placing an order.",
        "You must not misuse or interfere with website functionality.",
        "Website content may not be copied or reproduced without permission.",
      ],
    },
    {
      number: "3.",
      title: "Products and Pricing",
      size: "lg",
      items: [
        "We aim to display accurate product descriptions and images.",
        "Product availability may change without prior notice.",
        "Prices are displayed according to your selected shopping market.",
        "Website content may not be copied or reproduced without permission.",
      ],
    },
    {
      number: "4.",
      title: "Orders and Payments",
      size: "lg",
      items: [
        "Orders are subject to product availability and confirmation.",
        "Customers must provide accurate billing and delivery information.",
        "Available payment methods are displayed during checkout.",
        "An order confirmation does not necessarily mean that an order has been dispatched.",
      ],
    },
    {
      number: "5.",
      title: "Shipping and Delivery",
      size: "lg",
      items: [
        "Delivery options and estimated delivery times are shown during checkout where available.",
        "Delivery timelines may vary depending on location and shipping conditions.",
        "Customers are responsible for providing a complete and accurate delivery address.",
      ],
    },
    {
      number: "6.",
      title: "Returns and Refunds",
      size: "lg",
      items: [
        "Returns and refunds are subject to our Returns & Refunds Policy.",
        "Customers should review the applicable return conditions before requesting a return.",
        "Refund processing depends on the approved return and applicable payment method.",
      ],
    },
  ] satisfies TermsSection[],
};
