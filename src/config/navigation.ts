export interface NavLink {
  label: string;
  href: string;
}

export const categoryLinks: NavLink[] = [
  { label: "Men", href: "/men" },
  { label: "Ladies", href: "/ladies" },
  { label: "Kids", href: "/kids" },
  { label: "Bags", href: "/bags" },
  { label: "Fragrances", href: "/fragrances" },
];

export const mainNav: { links: NavLink[]; categoryLabel: string } = {
  categoryLabel: "Category",
  links: [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/contact" },
  ],
};

export const headerActions = {
  search: { label: "Search", href: "/search" },
  cart: { label: "Cart", href: "/cart" },
  wishlist: { label: "Wishlist", href: "/wishlist" },
  account: { label: "Account", href: "/login" },
} as const;

export const footerColumns: { title: string; links: NavLink[] }[] = [
  { title: "Shop", links: categoryLinks },
  {
    title: "Help",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Shipping Policy", href: "/shipping-returns" },
      { label: "Returns & Refunds", href: "/shipping-returns" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
];

export const footerLegalLinks: NavLink[] = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookies Policy", href: "/cookies" },
];
