import type {
  CatalogFacets,
  FilterableProduct,
} from "@/features/catalog/types";

/** A product on the all-products page, with the names the search also looks at. */
export interface ListedProduct extends FilterableProduct {
  categoryLabel?: string;
  subcategoryLabel?: string;
  collectionLabel?: string;
}

/** Everything the products page needs. The backend will return this from GET /products. */
export interface ProductListing {
  facets: CatalogFacets;
  products: ListedProduct[];
}
