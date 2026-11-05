import { parseMajorToMinor } from "@/features/admin-shell/admin-money";

import type { CategoryBody } from "./admin-catalog-service";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SITE_PATH = /^\/(?!\/)[A-Za-z0-9/_.\-]+$/;
const POSITION =
  /^(\d{1,3}%|left|center|right|top|bottom)( (\d{1,3}%|left|center|right|top|bottom))?$/;

/** A web address part made from a name: "Men Casual & Co" → "men-casual-co". */
export function slugFromLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** "S, M, L" or one per line → ["S", "M", "L"]. */
export const sizesFromText = (text: string): string[] =>
  text
    .split(/[,\n]/)
    .map((size) => size.trim())
    .filter(Boolean);

export interface NameSlug {
  label: string;
  slug: string;
}

export function nameSlugProblems(values: NameSlug): Partial<NameSlug> {
  const problems: Partial<NameSlug> = {};
  if (!values.label.trim()) problems.label = "Enter a name";
  else if (values.label.trim().length > 60)
    problems.label = "Keep it under 60 characters";
  if (!values.slug.trim()) problems.slug = "Enter a web address";
  else if (!SLUG.test(values.slug.trim()))
    problems.slug = "Use lowercase letters, digits and single dashes";
  return problems;
}

export interface CategoryText {
  label: string;
  slug: string;
  heroTitle: string;
  title: string;
  description: string;
  heroImageSrc: string;
  heroImageAlt: string;
  heroImagePosition: string;
  allLabel: string;
  filterSizes: string;
  priceMin: string;
  priceMax: string;
  priceStep: string;
}

export type CategoryProblems = Partial<Record<keyof CategoryText, string>>;

export function categoryProblems(values: CategoryText): CategoryProblems {
  const problems: CategoryProblems = { ...nameSlugProblems(values) };
  const required: [keyof CategoryText, string, number][] = [
    ["heroTitle", "Enter the hero title", 100],
    ["title", "Enter the page title", 120],
    ["description", "Enter the description", 1000],
    ["allLabel", "Enter the text of the first pill", 60],
  ];
  for (const [key, message, max] of required) {
    const value = values[key].trim();
    if (!value) problems[key] = message;
    else if (value.length > max)
      problems[key] = `Keep it under ${max} characters`;
  }
  const src = values.heroImageSrc.trim();
  if (!src) problems.heroImageSrc = "Enter the picture address";
  else if (!SITE_PATH.test(src) || src.includes(".."))
    problems.heroImageSrc = "Use a path on this site, like /images/hero.jpg";
  if (values.heroImageAlt.trim().length > 200)
    problems.heroImageAlt = "Keep it under 200 characters";
  const position = values.heroImagePosition.trim();
  if (position && !POSITION.test(position))
    problems.heroImagePosition = "Use a position like 50% 25%";

  const sizes = sizesFromText(values.filterSizes);
  if (sizes.length > 20) problems.filterSizes = "At most 20 sizes";
  else if (sizes.some((size) => size.length > 20))
    problems.filterSizes = "Keep each size under 20 characters";
  else if (new Set(sizes).size !== sizes.length)
    problems.filterSizes = "List each size once";

  const min = parseMajorToMinor(values.priceMin);
  const max = parseMajorToMinor(values.priceMax);
  const step = parseMajorToMinor(values.priceStep);
  if (min === null) problems.priceMin = "Enter a number";
  if (max === null) problems.priceMax = "Enter a number";
  if (step === null || step < 1) problems.priceStep = "Enter a number above 0";
  if (min !== null && max !== null && min >= max)
    problems.priceMax = "The highest must be above the lowest";
  return problems;
}

/** The body for the API, once the form has no problems. Slider values are typed in whole currency and sent as minor units. */
export function categoryBody(values: CategoryText): CategoryBody {
  const position = values.heroImagePosition.trim();
  return {
    slug: values.slug.trim(),
    label: values.label.trim(),
    heroTitle: values.heroTitle.trim(),
    title: values.title.trim(),
    description: values.description.trim(),
    heroImageSrc: values.heroImageSrc.trim(),
    heroImageAlt: values.heroImageAlt.trim(),
    heroImagePosition: position || null,
    allLabel: values.allLabel.trim(),
    filterSizes: sizesFromText(values.filterSizes),
    priceMin: parseMajorToMinor(values.priceMin) ?? 0,
    priceMax: parseMajorToMinor(values.priceMax) ?? 0,
    priceStep: parseMajorToMinor(values.priceStep) ?? 1,
  };
}

/** Moves one item of a list to a new place (used for the order of lists). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
