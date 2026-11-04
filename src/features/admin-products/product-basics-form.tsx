"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import {
  Field,
  FormError,
  fieldError,
  inputClass,
  primaryButton,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import type {
  Availability,
  Category,
  Collection,
  Product,
  ProductBasics,
} from "./admin-products-service";
import { basicsProblems, notesFromText } from "./product-forms";

const AVAILABILITY: { value: Availability; label: string }[] = [
  { value: "in-stock", label: "In stock" },
  { value: "pre-order", label: "Pre-order" },
  { value: "fitting-ready", label: "Ready for fitting" },
];

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

/**
 * The name, category and the other plain facts of a product. It makes a new
 * product and changes an existing one: pass `product` to edit.
 */
export function ProductBasicsForm({
  product,
  categories,
  collections,
  submitLabel,
  pending,
  error,
  canEdit = true,
  onSubmit,
}: {
  product?: Product;
  categories: Category[];
  collections: Collection[];
  submitLabel: string;
  pending: boolean;
  error: unknown;
  canEdit?: boolean;
  onSubmit: (basics: ProductBasics) => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [tagline, setTagline] = useState(product?.tagline ?? "");
  const [categoryId, setCategoryId] = useState(product?.category?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState(
    product?.subcategory?.id ?? "",
  );
  const [collectionId, setCollectionId] = useState(
    product?.collection?.id ?? "",
  );
  const [availability, setAvailability] = useState<Availability | "">(
    product?.availability ?? "",
  );
  const [badgeLabel, setBadgeLabel] = useState(product?.badge?.label ?? "");
  const [badgeTone, setBadgeTone] = useState<"dark" | "light">(
    product?.badge?.tone ?? "dark",
  );
  const [isNew, setIsNew] = useState(product?.isNew ?? false);
  const [listed, setListed] = useState(product?.listed ?? true);
  const [hasSizeGuide, setHasSizeGuide] = useState(
    product?.hasSizeGuide ?? false,
  );
  const [notes, setNotes] = useState((product?.notes ?? []).join("\n"));
  const [shown, setShown] = useState(false);

  const problems = basicsProblems({ name, slug, tagline, badgeLabel, notes });
  const subcategories =
    categories.find((category) => category.id === categoryId)?.subcategories ??
    [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setShown(true);
    if (Object.keys(problems).length > 0) return;
    onSubmit({
      name: name.trim(),
      ...(slug.trim() ? { slug: slug.trim() } : {}),
      tagline: tagline.trim() || null,
      categoryId: categoryId || null,
      subcategoryId: categoryId && subcategoryId ? subcategoryId : null,
      collectionId: collectionId || null,
      availability: availability || null,
      badge: badgeLabel.trim()
        ? { label: badgeLabel.trim(), tone: badgeTone }
        : null,
      isNew,
      notes: notesFromText(notes),
      hasSizeGuide,
      listed,
    });
  }

  const select = (
    id: string,
    value: string,
    onChange: (value: string) => void,
    children: React.ReactNode,
    disabled?: boolean,
  ) => (
    <select
      id={id}
      value={value}
      disabled={disabled || !canEdit}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      {children}
    </select>
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="p-name"
          label="Product name"
          error={shown ? problems.name : fieldError(error, "name")}
        >
          <input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={160}
            disabled={!canEdit}
            aria-invalid={shown && Boolean(problems.name)}
            aria-describedby="p-name-error"
            className={inputClass}
          />
        </Field>
        <Field
          id="p-slug"
          label="Web address (slug)"
          hint={product ? undefined : "Leave empty to make it from the name."}
          error={shown ? problems.slug : fieldError(error, "slug")}
        >
          <input
            id="p-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="men-linen-shirt"
            maxLength={120}
            disabled={!canEdit}
            aria-invalid={shown && Boolean(problems.slug)}
            aria-describedby="p-slug-error"
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        id="p-tagline"
        label="Short line under the name (optional)"
        error={shown ? problems.tagline : undefined}
      >
        <input
          id="p-tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={300}
          disabled={!canEdit}
          aria-describedby="p-tagline-error"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="p-category" label="Category">
          {select(
            "p-category",
            categoryId,
            (value) => {
              setCategoryId(value);
              setSubcategoryId("");
            },
            <>
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </>,
          )}
        </Field>
        <Field id="p-subcategory" label="Type">
          {select(
            "p-subcategory",
            subcategoryId,
            setSubcategoryId,
            <>
              <option value="">No type</option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </>,
            subcategories.length === 0,
          )}
        </Field>
        <Field id="p-collection" label="Collection">
          {select(
            "p-collection",
            collectionId,
            setCollectionId,
            <>
              <option value="">No collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.label}
                </option>
              ))}
            </>,
          )}
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="p-availability" label="Availability label">
          {select(
            "p-availability",
            availability,
            (value) => setAvailability(value as Availability | ""),
            <>
              <option value="">None</option>
              {AVAILABILITY.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </>,
          )}
        </Field>
        <Field
          id="p-badge"
          label="Badge text (optional)"
          error={shown ? problems.badgeLabel : undefined}
        >
          <input
            id="p-badge"
            value={badgeLabel}
            onChange={(e) => setBadgeLabel(e.target.value)}
            placeholder="e.g. Best seller"
            maxLength={30}
            disabled={!canEdit}
            aria-describedby="p-badge-error"
            className={inputClass}
          />
        </Field>
        <Field id="p-tone" label="Badge colour">
          {select(
            "p-tone",
            badgeTone,
            (value) => setBadgeTone(value as "dark" | "light"),
            <>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </>,
            !badgeLabel.trim(),
          )}
        </Field>
      </div>

      <Field
        id="p-notes"
        label="Short notes (one per line, up to 10)"
        error={shown ? problems.notes : fieldError(error, "notes")}
      >
        <textarea
          id="p-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={!canEdit}
          aria-invalid={shown && Boolean(problems.notes)}
          aria-describedby="p-notes-error"
          className={cn(inputClass, "h-auto py-2")}
        />
      </Field>

      <div className="grid gap-3 rounded-lg border border-border bg-white p-3 sm:grid-cols-3">
        <Toggle
          label="Shown in the shop"
          hint="Off hides it from lists"
          checked={listed}
          onChange={setListed}
        />
        <Toggle
          label="Marked as new"
          hint="Adds the “New” tag"
          checked={isNew}
          onChange={setIsNew}
        />
        <Toggle
          label="Has a size guide"
          hint="Shows the size guide link"
          checked={hasSizeGuide}
          onChange={setHasSizeGuide}
        />
      </div>

      <FormError error={error} />
      {canEdit ? (
        <div>
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : submitLabel}
          </button>
        </div>
      ) : null}
    </form>
  );
}
