import {
  matchesFilters,
  paginate,
  sortProducts,
  type PageResult,
} from "@/features/catalog/query-catalog";
import type { CatalogFilters, SortValue } from "@/features/catalog/types";
import type { ListedProduct } from "@/features/products/types";
import type { RegionCode } from "@/types/region";

/*
 * Mock of the backend's GET /products?q= search. Words are matched by prefix
 * ("cash" finds "Cashmere") and ignore case, accents and a plural "s".
 * A product matches when it contains at least one word of the query; products
 * that contain more of the words, and in more important fields, rank first.
 * "Relevant Products" sorting uses this order.
 */

const NAME_WEIGHT = 3;
const LABEL_WEIGHT = 2;
const DETAIL_WEIGHT = 1;

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stem(word: string) {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
    ? word.slice(0, -1)
    : word;
}

function toWords(text: string) {
  const normalized = normalize(text);
  return normalized ? normalized.split(" ").map(stem) : [];
}

/** The distinct words of a search query. */
export function tokenize(query: string) {
  return [...new Set(toWords(query))];
}

function fieldsOf(product: ListedProduct) {
  return [
    { weight: NAME_WEIGHT, words: toWords(product.name) },
    {
      weight: LABEL_WEIGHT,
      words: toWords(
        [
          product.categoryLabel,
          product.subcategoryLabel,
          product.collectionLabel,
        ]
          .filter(Boolean)
          .join(" "),
      ),
    },
    {
      weight: DETAIL_WEIGHT,
      words: toWords(
        [
          ...(product.notes ?? []),
          ...(product.colors?.map((color) => color.name) ?? []),
        ].join(" "),
      ),
    },
  ];
}

/** Products matching the query, best match first. An empty query returns everything in its original order. */
export function searchProducts<T extends ListedProduct>(
  products: T[],
  query: string,
): T[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return products;

  return products
    .map((product, index) => {
      const fields = fieldsOf(product);
      let matched = 0;
      let score = 0;

      for (const token of tokens) {
        const best = Math.max(
          0,
          ...fields.map((field) =>
            field.words.some((word) => word.startsWith(token))
              ? field.weight
              : 0,
          ),
        );
        if (best > 0) {
          matched += 1;
          score += best;
        }
      }

      return { product, index, matched, score };
    })
    .filter((entry) => entry.matched > 0)
    .sort(
      (a, b) => b.matched - a.matched || b.score - a.score || a.index - b.index,
    )
    .map((entry) => entry.product);
}

export interface ProductsQuery {
  filters: CatalogFilters;
  sort: SortValue;
  region: RegionCode;
  page: number;
  pageSize: number;
}

/** Applies the sidebar filters and sort to the search matches, then takes one page. */
export function queryProducts<T extends ListedProduct>(
  matches: T[],
  { filters, sort, region, page, pageSize }: ProductsQuery,
): PageResult<T> {
  const filtered = matches.filter((product) =>
    matchesFilters(product, filters, region),
  );
  return paginate(sortProducts(filtered, sort, region), page, pageSize);
}
