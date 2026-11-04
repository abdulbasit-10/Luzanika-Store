"use client";

import { useState } from "react";

import {
  Field,
  FormError,
  fieldError,
  inputClass,
  primaryButton,
} from "@/features/admin-shell/admin-ui";
import { minorToText } from "@/features/admin-products/product-forms";
import { cn } from "@/utils/cn";

import type { Category, CategoryBody } from "./admin-catalog-service";
import {
  categoryBody,
  categoryProblems,
  slugFromLabel,
  type CategoryText,
} from "./catalog-forms";

const EMPTY: CategoryText = {
  label: "",
  slug: "",
  heroTitle: "",
  title: "",
  description: "",
  heroImageSrc: "",
  heroImageAlt: "",
  heroImagePosition: "50% 50%",
  allLabel: "",
  filterSizes: "S, M, L, XL",
  priceMin: "500",
  priceMax: "5000",
  priceStep: "50",
};

function toText(category: Category): CategoryText {
  return {
    label: category.label,
    slug: category.slug,
    heroTitle: category.heroTitle,
    title: category.title,
    description: category.description,
    heroImageSrc: category.heroImage.src,
    heroImageAlt: category.heroImage.alt,
    heroImagePosition: category.heroImage.position ?? "",
    allLabel: category.allLabel,
    filterSizes: category.filterSizes.join(", "),
    priceMin: minorToText(category.priceRange.min),
    priceMax: minorToText(category.priceRange.max),
    priceStep: minorToText(category.priceRange.step),
  };
}

/** The words, picture and filters of one category page. Pass `category` to change one. */
export function CategoryForm({
  category,
  pending,
  error,
  onSubmit,
}: {
  category?: Category;
  pending: boolean;
  error: unknown;
  onSubmit: (body: CategoryBody) => void;
}) {
  const [values, setValues] = useState<CategoryText>(
    category ? toText(category) : EMPTY,
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [shown, setShown] = useState(false);
  const problems = categoryProblems(values);

  const set = (patch: Partial<CategoryText>) =>
    setValues((current) => ({ ...current, ...patch }));
  const err = (key: keyof CategoryText) =>
    shown ? problems[key] : fieldError(error, key);
  const text = (
    key: keyof CategoryText,
    label: string,
    props: { placeholder?: string; hint?: string; max?: number } = {},
  ) => (
    <Field id={`c-${key}`} label={label} error={err(key)} hint={props.hint}>
      <input
        id={`c-${key}`}
        value={values[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        placeholder={props.placeholder}
        maxLength={props.max}
        aria-invalid={Boolean(err(key))}
        aria-describedby={`c-${key}-error`}
        className={inputClass}
      />
    </Field>
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setShown(true);
        if (Object.keys(problems).length === 0) onSubmit(categoryBody(values));
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="c-label" label="Name in the menu" error={err("label")}>
          <input
            id="c-label"
            value={values.label}
            onChange={(e) =>
              set({
                label: e.target.value,
                ...(slugTouched ? {} : { slug: slugFromLabel(e.target.value) }),
              })
            }
            maxLength={60}
            aria-invalid={Boolean(err("label"))}
            aria-describedby="c-label-error"
            className={inputClass}
          />
        </Field>
        <Field
          id="c-slug"
          label="Web address"
          error={err("slug")}
          hint={
            category ? "Changing it breaks old links to the page." : undefined
          }
        >
          <input
            id="c-slug"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: e.target.value });
            }}
            maxLength={120}
            aria-invalid={Boolean(err("slug"))}
            aria-describedby="c-slug-error"
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {text("heroTitle", "Big title on the page", { max: 100 })}
        {text("title", "Page title (browser tab)", { max: 120 })}
      </div>
      <Field id="c-description" label="Description" error={err("description")}>
        <textarea
          id="c-description"
          value={values.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={3}
          maxLength={1000}
          aria-invalid={Boolean(err("description"))}
          aria-describedby="c-description-error"
          className={cn(inputClass, "h-auto py-2")}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        {text("heroImageSrc", "Picture address", {
          placeholder: "/images/categories/men-hero.jpg",
          hint: "A picture already on the site.",
          max: 300,
        })}
        {text("heroImageAlt", "Picture description", { max: 200 })}
        {text("heroImagePosition", "Where to crop from", {
          placeholder: "50% 25%",
          hint: "Keeps the subject in view.",
          max: 40,
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {text("allLabel", "First filter pill", {
          placeholder: "ALL SHOES",
          max: 60,
        })}
        {text("filterSizes", "Sizes in the filter", {
          placeholder: "S, M, L, XL",
          hint: "Separate with commas.",
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {text("priceMin", "Price slider, lowest")}
        {text("priceMax", "Price slider, highest")}
        {text("priceStep", "Price slider, step")}
      </div>
      <p className="text-xs text-muted-foreground">
        The slider uses the same numbers in both markets.
      </p>
      <FormError error={error} />
      <div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : category ? "Save category" : "Create category"}
        </button>
      </div>
    </form>
  );
}
