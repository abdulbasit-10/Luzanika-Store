/** Copy of the Search Result Figma frame, plus the wording for states the design does not show. */
export const productsPage = {
  /** Products per page: three rows of the three-column grid. */
  pageSize: 9,
  /** Heading when there is no search (not in the Figma). */
  allTitle: "All Products",
  trendingLabel: "Trending searches:",
  trendingSearches: [
    "Raw Silk Kurta",
    "Cashmere Overcoat",
    "Travel Duffle",
    "Amber EDP",
    "Lahore Khadi",
  ],
  searchPlaceholder: "Search products…",
  /** Figma sentence under the heading; only the number is computed. */
  studios:
    "curated across Lahore and Berlin studios for artisanal summer layering",
} as const;
