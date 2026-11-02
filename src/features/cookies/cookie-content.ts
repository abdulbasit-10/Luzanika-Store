/*
 * Copied from the Figma "Cookies Policy" frames. The Figma marks this as
 * suggested copy that the client must confirm; the retention text (section 6)
 * was cut off in the design and is written to match the real behaviour.
 */
export const cookiesPolicy = {
  title: "Cookies Policy",
  eyebrow: "Client care and privacy archive",
  heading: "Cookies Policy",
  description:
    "Learn how we use cookies to improve your browsing and shopping experience with quiet precision.",
  lastUpdated: "October 24, 2024",
  version: "1.8",
  welcome: {
    title: "Welcome to Our Cookies Policy",
    description:
      "At Luzanika, we use cookies and similar technologies to help our website work properly, understand how visitors interact with our boutique store, and elevate your sartorial shopping experience. We respect the sacred trust of your digital environment.",
  },
} as const;

export const cookieIndex = [
  { id: "what-are-cookies", label: "What Are Cookies?" },
  { id: "how-we-use-cookies", label: "How We Use Them" },
  { id: "types-of-cookies", label: "Types of Cookies" },
  { id: "third-party-cookies", label: "Third Parties" },
  { id: "managing-preferences", label: "Preferences" },
  { id: "retention", label: "Retention" },
  { id: "policy-updates", label: "Policy Updates" },
  { id: "client-support", label: "Client Support" },
] as const;

export const cookieFeatureCards = [
  {
    title: "Local & Encrypted",
    text: "Stored on your client browser, inaccessible across unrelated origins.",
    icon: "lock",
  },
  {
    title: "Granular Sovereignty",
    text: "You maintain complete autonomy over what records your device preserves.",
    icon: "sliders",
  },
] as const;

export const cookieUses = [
  "Keep your shopping cart information intact while traversing our collections.",
  "Remember your selected market, language, and regional delivery preferences.",
  "Help verified clients maintain secure log-in states within the private member salon.",
  "Understand website traffic distribution and elevate page render efficiency.",
  "Improve responsive layout behaviors across mobile, tablet, and widescreen displays.",
] as const;

export type CookieCategoryKey = "functional" | "analytics" | "marketing";

export interface CookieType {
  title: string;
  /** Short description in the "types" cards. */
  text: string;
  tag: string;
  badge: "Always Active" | "Configurable";
  /** Description shown next to the switch in the preferences panel. */
  switchText: string;
  key: CookieCategoryKey | "essential";
}

export const cookieTypes: CookieType[] = [
  {
    key: "essential",
    title: "Essential Cookies",
    text: "Help core boutique features—such as basket persistence, order completion, and tokenized session access—function correctly.",
    tag: "Strictly Necessary • Required",
    badge: "Always Active",
    switchText:
      "Required for basic website functionality, navigation, and bag checkout security.",
  },
  {
    key: "functional",
    title: "Functional Cookies",
    text: "Remember your bespoke settings including currency selections (e.g., USD, EUR, PKR), preferred measurements, and volume presets.",
    tag: "Client Preferences & Memory",
    badge: "Configurable",
    switchText:
      "Remember your preferences, sizing unit parameters, and localized atelier settings.",
  },
  {
    key: "analytics",
    title: "Analytics Cookies",
    text: "Help our team understand aggregate journey metrics, time per lookbook, and potential navigation roadblocks anonymously.",
    tag: "Aggregated & De-identified",
    badge: "Configurable",
    switchText:
      "Help us understand website usage anonymously to refine performance speeds.",
  },
  {
    key: "marketing",
    title: "Marketing Cookies",
    text: "May be utilized to present tailored salon releases, campaign stories, and gauge the response of curated lookbook dispatches.",
    tag: "Editorial Announcements",
    badge: "Configurable",
    switchText:
      "Support relevant advertising, seasonal showcase reminders, and lookbook alerts.",
  },
];

export const thirdPartyCookies = {
  body: "Some cookies may be placed by trusted third-party services integrated into our store infrastructure, such as analytical platforms, payment token gateways, and global carrier tracking interfaces.",
  noteTitle: "Atelier Transparency Note",
  note: "Financial transactions are tokenized through strictly encrypted PCI-DSS Level 1 payment gateways (Stripe, Apple Pay). Real-time courier dispatch status (DHL Express / FedEx Priority) relies on ephemeral verification identifiers that never record your browsing history outside our boutique.",
  tags: ["Tokenized Checkout", "Encrypted Telemetry", "Zero Data Brokerage"],
} as const;

export const managePreferences = {
  body: "You may manage or adjust your cookie preferences at any time through our on-site settings panel or natively via your browser configurations:",
  browsers: [
    {
      name: "Apple Safari",
      href: "https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac",
    },
    {
      name: "Google Chrome",
      href: "https://support.google.com/chrome/answer/95647",
    },
    {
      name: "Mozilla Firefox",
      href: "https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox",
    },
    {
      name: "Microsoft Edge",
      href: "https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09",
    },
  ],
} as const;

export const retention =
  "Some cookies are deleted when you close your browser, while others remain on your device for a specified period or until you delete them. Your own cookie choices are remembered for 12 months, after which we will ask you again.";

export const policyUpdates =
  "We may update this Cookies Policy from time to time to mirror changes in legal obligations, browser architectures, or our bespoke catalog capabilities. Any revisions will be published on this page accompanied by an updated revision date.";

export const clientSupport = {
  body: "If you have questions, inquiries, or bespoke data requests regarding our Cookies Policy, our concierge and privacy compliance specialists remain at your service:",
  officerLabel: "Data Protection Officer",
} as const;

export const moreInformation = {
  eyebrow: "Private atelier support",
  title: "Need More Information?",
  text: "If you have questions about our policies or wish to explore bespoke styling assistance, our team is here to help.",
} as const;

export const consentNotice = {
  title: "Atelier Privacy Notice",
  text: "We value your privacy. Luzanika uses cookies to ensure basic site operations, enhance your shopping experience, and deliver curated editorial content in accordance with international standards.",
} as const;
