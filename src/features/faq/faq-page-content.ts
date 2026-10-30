import type { FaqItem } from "@/features/faq/faq-items";

export interface FaqGroup {
  id: string;
  /** Label of the filter pill. */
  pillLabel: string;
  /** Heading of the group. */
  title: string;
  /** Whether the first question starts open (Figma shows it open in all groups but Products). */
  openFirstByDefault: boolean;
  items: FaqItem[];
}

export const faqPage = {
  eyebrow: "Client Concierge Archive",
  title: "Frequently Asked Questions",
  description:
    "Find answers to common questions about shopping with Luzanika. We’re here to make your shopping experience simple and enjoyable.",
  searchPlaceholder: "Search common questions, topics, or keywords...",
  hero: {
    title: "Frequently Asked Questions",
    image: { src: "/images/faq/hero.jpg", alt: "", position: "50% 50%" },
  },
};

/*
 * Question wording and the first answer of each group come from the Figma
 * frame. The other answers are placeholders until the client supplies the copy.
 */
export const faqGroups: FaqGroup[] = [
  {
    id: "orders",
    pillLabel: "Orders",
    title: "Orders",
    openFirstByDefault: true,
    items: [
      {
        id: "place-order",
        question: "How can I place an order?",
        answer:
          "Browse our collections, select your preferred product and options, add it to your cart, and complete checkout.",
      },
      {
        id: "track-order",
        question: "Can I track my order?",
        answer:
          "Once your order is placed, you can follow its status from your account under Order History.",
      },
      {
        id: "cancel-order",
        question: "Can I cancel my order?",
        answer:
          "Please contact us as soon as possible after placing your order and we will let you know if it can be cancelled.",
      },
    ],
  },
  {
    id: "payments",
    pillLabel: "Payments",
    title: "Payments",
    openFirstByDefault: true,
    items: [
      {
        id: "payment-methods",
        question: "What payment methods do you accept?",
        answer: "Available payment methods will be displayed during checkout.",
      },
      {
        id: "payment-secure",
        question: "Is online payment secure?",
        answer: "Payment details are entered securely during checkout.",
      },
    ],
  },
  {
    id: "shipping-delivery",
    pillLabel: "Shipping & Delivery",
    title: "Shipping And Delivery",
    openFirstByDefault: true,
    items: [
      {
        id: "deliver-internationally",
        question: "Do you deliver internationally?",
        answer:
          "Available delivery locations and shipping options are displayed during checkout.",
      },
      {
        id: "delivery-time",
        question: "How long does delivery take?",
        answer: "Estimated delivery times will be displayed during checkout.",
      },
    ],
  },
  {
    id: "returns-refunds",
    pillLabel: "Returns & Refunds",
    title: "Returns And Refunds",
    openFirstByDefault: true,
    items: [
      {
        id: "return-product",
        question: "Can I return a product?",
        answer:
          "Please review our Returns & Refunds Policy for eligibility and instructions.",
      },
      {
        id: "receive-refund",
        question: "How will I receive my refund?",
        answer: "Refund details are available in our Returns & Refunds Policy.",
      },
    ],
  },
  {
    id: "products",
    pillLabel: "Products",
    title: "Products",
    openFirstByDefault: false,
    items: [
      {
        id: "product-care",
        question: "How do I care for Luzanika raw materials and textiles?",
        answer: "Care instructions are provided with each product.",
      },
      {
        id: "sizing",
        question: "Where can I locate sizing and tailored dimensions?",
        answer: "Sizing details are available on each product page.",
      },
    ],
  },
];
