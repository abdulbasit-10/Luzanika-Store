"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";

import {
  DetailCard,
  FormError,
  inputClass,
  primaryButton,
} from "@/features/admin-shell/admin-ui";
import { fetchProducts } from "@/features/admin-products/admin-products-service";

import {
  fetchHomeSections,
  setHomeSection,
  type HomeSection,
  type HomeSectionName,
} from "./admin-catalog-service";
import { moveItem } from "./catalog-forms";
import { dangerLinkButton, iconButton, useCatalogChange } from "./catalog-ui";

const MAX_PER_SECTION = 24;

const SECTION_TEXT: Record<HomeSectionName, { title: string; hint: string }> = {
  featured: {
    title: "Featured",
    hint: "The big row of hand-picked products on the home page.",
  },
  "new-arrivals": {
    title: "New arrivals",
    hint: "What is newest in the shop.",
  },
  "special-offers": {
    title: "Special offers",
    hint: "Products on offer.",
  },
};

type Picked = { id: string; name: string };

function SectionCard({
  section,
  options,
}: {
  section: HomeSection;
  options: Picked[];
}) {
  const [picked, setPicked] = useState<Picked[]>(
    section.products.map(({ id, name }) => ({ id, name })),
  );
  const save = useCatalogChange(
    () =>
      setHomeSection(
        section.section,
        picked.map((product) => product.id),
      ),
    `${SECTION_TEXT[section.section].title} saved`,
  );
  const available = options.filter(
    (option) => !picked.some((product) => product.id === option.id),
  );
  const full = picked.length >= MAX_PER_SECTION;
  const text = SECTION_TEXT[section.section];

  return (
    <DetailCard title={`${text.title} (${picked.length})`}>
      <p className="mb-2 text-sm text-muted-foreground">{text.hint}</p>
      <ul className="flex flex-col gap-1.5">
        {picked.map((product, index) => (
          <li
            key={product.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">{product.name}</span>
            <button
              type="button"
              aria-label={`Move ${product.name} up`}
              disabled={index === 0}
              onClick={() => setPicked(moveItem(picked, index, index - 1))}
              className={iconButton}
            >
              <ArrowUp aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Move ${product.name} down`}
              disabled={index === picked.length - 1}
              onClick={() => setPicked(moveItem(picked, index, index + 1))}
              className={iconButton}
            >
              <ArrowDown aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setPicked(picked.filter((item) => item.id !== product.id))
              }
              className={dangerLinkButton}
            >
              Remove
            </button>
          </li>
        ))}
        {picked.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            Empty. The shop shows nothing in this row.
          </li>
        ) : null}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="min-w-[12rem] flex-1">
          <span className="sr-only">Add a product to {text.title}</span>
          <select
            value=""
            disabled={full || available.length === 0}
            onChange={(event) => {
              const found = available.find(
                (option) => option.id === event.target.value,
              );
              if (found) setPicked([...picked, found]);
            }}
            className={inputClass}
          >
            <option value="">
              {full ? `Full (${MAX_PER_SECTION} products)` : "Add a product…"}
            </option>
            {available.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate(undefined)}
          className={primaryButton}
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
      <FormError error={save.error} />
    </DetailCard>
  );
}

/** The product rows of the shop's home page. */
export function HomeTab() {
  const sections = useQuery({
    queryKey: ["admin", "home"],
    queryFn: fetchHomeSections,
    staleTime: 10_000,
  });
  // Only products that are on sale can be chosen.
  const products = useQuery({
    queryKey: ["admin", "products", "for-home"],
    queryFn: () => fetchProducts({ status: "active" }, 1, 100),
    staleTime: 30_000,
  });

  if (sections.isPending || products.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading the home page rows…
      </p>
    );
  if (sections.isError || products.isError)
    return (
      <p role="alert" className="text-sm text-danger">
        We couldn&apos;t load the home page rows. Check your connection and
        reload.
      </p>
    );

  const options = products.data.items.map(({ id, name }) => ({ id, name }));

  return (
    <div className="grid items-start gap-[clamp(0.5rem,1.6dvh,1.25rem)] lg:grid-cols-2">
      {sections.data.map((section) => (
        <SectionCard
          key={section.section}
          section={section}
          options={options}
        />
      ))}
    </div>
  );
}
