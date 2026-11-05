"use client";

import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DetailCard,
  Field,
  FormError,
  fieldError,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/features/admin-shell/admin-ui";
import { useQuery } from "@tanstack/react-query";

import {
  createSubcategory,
  deleteSubcategory,
  fetchCollections,
  setCategoryCollections,
  updateSubcategory,
  type Category,
  type Subcategory,
} from "./admin-catalog-service";
import { moveItem, nameSlugProblems, slugFromLabel } from "./catalog-forms";
import {
  dangerLinkButton,
  iconButton,
  linkButton,
  useCatalogChange,
} from "./catalog-ui";

/** Add a type to a category, or rename one. */
function TypeDialog({
  categoryId,
  type,
  onClose,
}: {
  categoryId: string;
  type: Subcategory | null;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(type?.label ?? "");
  const [slug, setSlug] = useState(type?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(type));
  const [shortLabel, setShortLabel] = useState(type?.shortLabel ?? "");
  const [shown, setShown] = useState(false);
  const problems = nameSlugProblems({ label, slug });
  const shortProblem =
    shortLabel.trim().length > 40 ? "Keep it under 40 characters" : undefined;

  const save = useCatalogChange(
    () => {
      const body = {
        slug: slug.trim(),
        label: label.trim(),
        shortLabel: shortLabel.trim() || null,
      };
      return type
        ? updateSubcategory(type.id, body)
        : createSubcategory(categoryId, body);
    },
    type ? "Type saved" : "Type added",
    onClose,
  );

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (Object.keys(problems).length === 0 && !shortProblem)
          save.mutate(undefined);
      }}
      title={type ? "Change type" : "Add a type"}
      description="A type is a group of products inside a category, such as Casual Wear or Handbags."
      confirmLabel={type ? "Save type" : "Add type"}
      pendingLabel="Saving…"
      pending={save.isPending}
    >
      <div className="flex flex-col gap-3">
        <Field
          id="t-label"
          label="Name"
          error={shown ? problems.label : fieldError(save.error, "label")}
        >
          <input
            id="t-label"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!slugTouched) setSlug(slugFromLabel(e.target.value));
            }}
            maxLength={60}
            aria-describedby="t-label-error"
            className={inputClass}
          />
        </Field>
        <Field
          id="t-slug"
          label="Web address"
          error={shown ? problems.slug : fieldError(save.error, "slug")}
        >
          <input
            id="t-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            maxLength={120}
            aria-describedby="t-slug-error"
            className={inputClass}
          />
        </Field>
        <Field
          id="t-short"
          label="Short name (optional)"
          hint="Used where space is tight."
          error={shown ? shortProblem : fieldError(save.error, "shortLabel")}
        >
          <input
            id="t-short"
            value={shortLabel}
            onChange={(e) => setShortLabel(e.target.value)}
            maxLength={40}
            aria-describedby="t-short-error"
            className={inputClass}
          />
        </Field>
        <FormError error={save.error} />
      </div>
    </ConfirmDialog>
  );
}

function DeleteTypeDialog({
  type,
  onClose,
}: {
  type: Subcategory;
  onClose: () => void;
}) {
  const remove = useCatalogChange(
    () => deleteSubcategory(type.id),
    "Type deleted",
    onClose,
  );
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => remove.mutate(undefined)}
      title={`Delete “${type.label}”?`}
      description={
        type.productCount > 0
          ? `${type.productCount} product${type.productCount === 1 ? "" : "s"} belong to it. Move them to another type first.`
          : "No product belongs to it. This cannot be undone."
      }
      confirmLabel="Delete type"
      pendingLabel="Deleting…"
      pending={remove.isPending}
      confirmDisabled={type.productCount > 0}
    >
      <FormError error={remove.error} />
    </ConfirmDialog>
  );
}

/** The groups inside a category. They are shown in the order of the list. */
export function TypesCard({ category }: { category: Category }) {
  const [dialog, setDialog] = useState<
    | { kind: "edit"; type: Subcategory | null }
    | { kind: "delete"; type: Subcategory }
    | null
  >(null);

  const reorder = useCatalogChange(
    async ({ from, to }: { from: number; to: number }) => {
      const next = moveItem(category.subcategories, from, to);
      // Each type keeps a position number; write the new order as 0, 1, 2…
      await Promise.all(
        next.map((type, index) =>
          type.sort === index
            ? null
            : updateSubcategory(type.id, { sort: index }),
        ),
      );
    },
    "Order saved",
  );
  const last = category.subcategories.length - 1;

  return (
    <DetailCard
      title={`Types (${category.subcategories.length})`}
      action={
        <button
          type="button"
          onClick={() => setDialog({ kind: "edit", type: null })}
          className={secondaryButton}
        >
          <Plus aria-hidden className="size-4" />
          Add type
        </button>
      }
    >
      {category.subcategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No types yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {category.subcategories.map((type, index) => (
            <li
              key={type.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {type.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  /{type.slug} · {type.productCount}{" "}
                  {type.productCount === 1 ? "product" : "products"}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Move ${type.label} up`}
                disabled={index === 0 || reorder.isPending}
                onClick={() => reorder.mutate({ from: index, to: index - 1 })}
                className={iconButton}
              >
                <ArrowUp aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${type.label} down`}
                disabled={index === last || reorder.isPending}
                onClick={() => reorder.mutate({ from: index, to: index + 1 })}
                className={iconButton}
              >
                <ArrowDown aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: "edit", type })}
                className={linkButton}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: "delete", type })}
                className={dangerLinkButton}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <FormError error={reorder.error} />
      {dialog?.kind === "edit" ? (
        <TypeDialog
          categoryId={category.id}
          type={dialog.type}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <DeleteTypeDialog type={dialog.type} onClose={() => setDialog(null)} />
      ) : null}
    </DetailCard>
  );
}

/** Which collections appear as filter choices on this category's page, and in what order. */
export function FilterChoicesCard({ category }: { category: Category }) {
  const collections = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: fetchCollections,
    staleTime: 30_000,
  });
  const [chosen, setChosen] = useState<string[]>(
    category.collections.map((collection) => collection.id),
  );
  const save = useCatalogChange(
    () => setCategoryCollections(category.id, chosen),
    "Filter choices saved",
  );

  const all = collections.data ?? [];
  const label = (id: string) =>
    all.find((collection) => collection.id === id)?.label ?? "…";
  const unchosen = all.filter((collection) => !chosen.includes(collection.id));

  return (
    <DetailCard title="Filter choices on the page">
      <p className="mb-2 text-sm text-muted-foreground">
        The “Category” choices shoppers see in the filter, in this order.
      </p>
      {collections.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading…
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {chosen.map((id, index) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{label(id)}</span>
                <button
                  type="button"
                  aria-label={`Move ${label(id)} up`}
                  disabled={index === 0}
                  onClick={() => setChosen(moveItem(chosen, index, index - 1))}
                  className={iconButton}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${label(id)} down`}
                  disabled={index === chosen.length - 1}
                  onClick={() => setChosen(moveItem(chosen, index, index + 1))}
                  className={iconButton}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setChosen(chosen.filter((item) => item !== id))
                  }
                  className={dangerLinkButton}
                >
                  Remove
                </button>
              </li>
            ))}
            {chosen.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                None. The page shows no filter choices.
              </li>
            ) : null}
          </ul>
          {unchosen.length > 0 ? (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                Add a collection
              </p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {unchosen.map((collection) => (
                  <li key={collection.id}>
                    <Checkbox
                      label={collection.label}
                      checked={false}
                      onChange={() => setChosen([...chosen, collection.id])}
                      className="items-center text-foreground"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
      <FormError error={save.error} />
      <div className="mt-3">
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate(undefined)}
          className={primaryButton}
        >
          {save.isPending ? "Saving…" : "Save filter choices"}
        </button>
      </div>
    </DetailCard>
  );
}
