export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

// Only answer 04 comes from Figma. The other answers are placeholders until
// the client supplies the copy.
export const faqItems: FaqItem[] = [
  {
    id: "place-order",
    question: "How can I place an order?",
    answer:
      "Choose your product, select the size and colour, add it to your cart, and complete the checkout.",
  },
  {
    id: "payment-methods",
    question: "What payment methods do you accept?",
    answer:
      "The payment methods available for your region will be shown during checkout.",
  },
  {
    id: "track-order",
    question: "How can I track my order?",
    answer:
      "Once your order is placed, you can follow its status from your account under Order History.",
  },
  {
    id: "delivery",
    question: "Do you deliver to Pakistan and Germany?",
    answer:
      "Yes, Luzanika serves customers in Pakistan and Germany. Available delivery options, charges, and estimated delivery times will be shown during checkout.",
  },
  {
    id: "returns",
    question: "Can I return or exchange a product?",
    answer:
      "Return and exchange details are available on our Shipping & Returns page.",
  },
];
