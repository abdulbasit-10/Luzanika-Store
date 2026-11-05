"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DetailCard,
  FormError,
  primaryButton,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type Category,
} from "./admin-catalog-service";
import { CategoryForm } from "./category-form";
import { FilterChoicesCard, TypesCard } from "./category-parts";
import { dangerLinkButton, useCatalogChange } from "./catalog-ui";

function DeleteCategoryDialog({
  category,
  onClose,
  onDeleted,
}: {
  category: Category;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const remove = useCatalogChange(
    () => deleteCategory(category.id),
    "Category deleted",
    () => {
      onClose();
      onDeleted();
    },
  );
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => remove.mutate(undefined)}
      title={`Delete “${category.label}”?`}
      description={
        category.productCount > 0
          ? `${category.productCount} product${category.productCount === 1 ? "" : "s"} belong to it. Move them to another category first.`
          : "Its page and types disappear from the shop. This cannot be undone."
      }
      confirmLabel="Delete category"
      pendingLabel="Deleting…"
      pending={remove.isPending}
      confirmDisabled={category.productCount > 0}
    >
      <FormError error={remove.error} />
    </ConfirmDialog>
  );
}

/** The editor of one category: its page, its types and its filter choices. */
function CategoryEditor({
  category,
  onDeleted,
}: {
  category: Category;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const save = useCatalogChange(
    (body: Parameters<typeof updateCategory>[1]) =>
      updateCategory(category.id, body),
    "Category saved",
  );

  return (
    <div className="flex flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
      <DetailCard
        title={`${category.label} page`}
        action={
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className={dangerLinkButton}
          >
            Delete
          </button>
        }
      >
        <CategoryForm
          category={category}
          pending={save.isPending}
          error={save.error}
          onSubmit={(body) => save.mutate(body)}
        />
      </DetailCard>
      <TypesCard category={category} />
      <FilterChoicesCard category={category} />
      {deleting ? (
        <DeleteCategoryDialog
          category={category}
          onClose={() => setDeleting(false)}
          onDeleted={onDeleted}
        />
      ) : null}
    </div>
  );
}

/** Categories: the pages of the shop's main menu (Men, Ladies, Bags…) and what is inside them. */
export function CategoriesTab() {
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
    staleTime: 10_000,
  });
  // `null` stands for the "new category" form.
  const [selected, setSelected] = useState<string | null | undefined>(
    undefined,
  );

  const create = useCatalogChange(createCategory, "Category created", (made) =>
    setSelected(made.id),
  );

  if (categories.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading categories…
      </p>
    );
  if (categories.isError)
    return (
      <p role="alert" className="text-sm text-danger">
        We couldn&apos;t load the categories. Check your connection and reload.
      </p>
    );

  const list = categories.data;
  const current =
    selected === null
      ? null
      : (list.find((item) => item.id === selected) ?? list[0] ?? null);
  const creating = selected === null;

  return (
    <div className="grid items-start gap-[clamp(0.5rem,1.6dvh,1.25rem)] lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav aria-label="Categories" className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className={cn(primaryButton, "justify-start")}
        >
          <Plus aria-hidden className="size-4" />
          New category
        </button>
        {list.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={current?.id === item.id ? "true" : undefined}
            onClick={() => setSelected(item.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              current?.id === item.id && !creating
                ? "bg-foreground text-white"
                : "border border-border bg-white text-foreground hover:bg-muted",
            )}
          >
            <span className="block font-semibold">{item.label}</span>
            <span
              className={cn(
                "block text-xs",
                current?.id === item.id && !creating
                  ? "text-white/70"
                  : "text-muted-foreground",
              )}
            >
              {item.productCount}{" "}
              {item.productCount === 1 ? "product" : "products"} ·{" "}
              {item.subcategories.length} types
            </span>
          </button>
        ))}
      </nav>
      {creating ? (
        <DetailCard title="New category">
          <CategoryForm
            pending={create.isPending}
            error={create.error}
            onSubmit={(body) => create.mutate(body)}
          />
        </DetailCard>
      ) : current ? (
        <CategoryEditor
          key={current.id}
          category={current}
          onDeleted={() => setSelected(undefined)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No categories yet. Make the first one.
        </p>
      )}
    </div>
  );
}
