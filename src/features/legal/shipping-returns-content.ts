import type { LegalChapter } from "@/features/legal/legal-content";

/*
 * DRAFT TEXT. This page was written by the developers as placeholder copy so
 * the footer links work; it is not from the Figma. Everything in
 * [square brackets] is a detail only Luzanika can fill in (delivery times,
 * the returns window, the returns address). The client must read and confirm
 * all of it, with their lawyer for the German market, before launch.
 * What it says about prices and payment matches what the website does today:
 * a flat shipping fee per order, shown before paying, and unpaid orders that
 * hold their items for 30 minutes.
 */
const draftNotice = {
  eyebrow: "Draft • To be confirmed by Luzanika",
  title: "Shipping And Returns",
  description:
    "How your order reaches you, and what to do if it is not right. This text is a draft and will be confirmed before launch.",
};

export const shippingReturns = {
  title: "Shipping & Returns",
  chapters: [
    {
      intro: draftNotice,
      eyebrow: "Section I • Delivery",
      title: "Shipping Policy",
      description:
        "Where we deliver, what delivery costs and how long it takes.",
      subsections: [
        {
          number: "1.1",
          title: "Where We Deliver",
          size: "lg",
          body: "We currently deliver to customers in Pakistan and Germany. The prices you see, the currency you pay in and the delivery fee depend on the country you choose in the selector at the top of the page. Items are stocked separately for each country, so availability can differ between them.",
        },
        {
          number: "1.2",
          title: "Delivery Cost",
          body: "Delivery is charged as one flat fee per order, not per item. The fee is shown in your cart and again at checkout, before you pay, and is part of the total you are charged. For orders to Germany, prices include VAT, and the amount of VAT is shown with your total.",
        },
        {
          number: "1.3",
          title: "Delivery Times",
          body: "[Luzanika to confirm: the usual delivery time to Pakistan and to Germany, the courier used, and whether tracking is provided.] You can follow the status of your order at any time under your orders.",
        },
        {
          number: "1.4",
          title: "Payment And Holding Your Items",
          body: "When you place an order, the items are held for you for 30 minutes while you pay. If the order is not paid in that time it is cancelled and the items go back on sale. You can also cancel an unpaid order yourself at any time from your order history.",
        },
      ],
    },
    {
      intro: draftNotice,
      eyebrow: "Section II • Returns",
      title: "Returns And Refunds",
      description:
        "What to do if an item is not right, and how refunds are made.",
      subsections: [
        {
          number: "2.1",
          title: "Returning An Item",
          size: "lg",
          body: "[Luzanika to confirm: how many days after delivery an item can be returned, the condition it must be in (unworn, with tags, in its original packaging), which items cannot be returned (for example fragrances that have been opened), and the address to send returns to.] To start a return, please contact us first through the contact page with your order code.",
        },
        {
          number: "2.2",
          title: "Refunds",
          body: "[Luzanika to confirm: how long a refund takes after the return arrives, and whether the original delivery fee is refunded.] [Luzanika to confirm: how refunds are paid back, for example to the original payment method.]",
        },
        {
          number: "2.3",
          title: "Damaged Or Wrong Items",
          body: "If your order arrives damaged or is not what you ordered, please contact us as soon as you can with your order code and a photo. [Luzanika to confirm: the time limit for reporting a problem and who pays for the return.]",
        },
        {
          number: "2.4",
          title: "Your Legal Rights",
          accent: true,
          body: "Nothing on this page limits the rights you have under the consumer laws that apply where you live. [Luzanika and its lawyer to confirm the wording for Germany, including the statutory right of withdrawal for online purchases.]",
        },
      ],
    },
  ] satisfies LegalChapter[],
};
