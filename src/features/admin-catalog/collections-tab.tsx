"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Field,
  FormError,
  TableMessage,
  bodyCell,
  fieldError,
  headCell,
  inputClass,
  primaryButton,
  tableCardClass,
} from "@/features/admin-shell/admin-ui";

import {
  createCollection,
  deleteCollection,
  fetchCollections,
  updateCollection,
  type Collection,
} from "./admin-catalog-service";
import { nameSlugProblems, slugFromLabel } from "./catalog-forms";
import { dangerLinkButton, linkButton, useCatalogChange } from "./catalog-ui";

function CollectionDialog({
  collection,
  onClose,
}: {
  collection: Collection | null;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(collection?.label ?? "");
  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(collection));
  const [shown, setShown] = useState(false);
  const problems = nameSlugProblems({ label, slug });

  const save = useCatalogChange(
    () => {
      const body = { slug: slug.trim(), label: label.trim() };
      return collection
        ? updateCollection(collection.id, body)
        : createCollection(body);
    },
    collection ? "Collection saved" : "Collection added",
    onClose,
  );

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (Object.keys(problems).length === 0) save.mutate(undefined);
      }}
      title={collection ? "Change collection" : "Add a collection"}
      description="A collection groups products across the shop, such as Men Casual or Handbags. It becomes a filter choice once you add it to a category."
      confirmLabel={collection ? "Save collection" : "Add collection"}
      pendingLabel="Saving…"
      pending={save.isPending}
    >
      <div className="flex flex-col gap-3">
        <Field
          id="col-label"
          label="Name"
          error={shown ? problems.label : fieldError(save.error, "label")}
        >
          <input
            id="col-label"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!slugTouched) setSlug(slugFromLabel(e.target.value));
            }}
            maxLength={60}
            aria-describedby="col-label-error"
            className={inputClass}
          />
        </Field>
        <Field
          id="col-slug"
          label="Web address"
          error={shown ? problems.slug : fieldError(save.error, "slug")}
        >
          <input
            id="col-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            maxLength={120}
            aria-describedby="col-slug-error"
            className={inputClass}
          />
        </Field>
        <FormError error={save.error} />
      </div>
    </ConfirmDialog>
  );
}

function DeleteCollectionDialog({
  collection,
  onClose,
}: {
  collection: Collection;
  onClose: () => void;
}) {
  const remove = useCatalogChange(
    () => deleteCollection(collection.id),
    "Collection deleted",
    onClose,
  );
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => remove.mutate(undefined)}
      title={`Delete “${collection.label}”?`}
      description={
        collection.productCount > 0
          ? `${collection.productCount} product${collection.productCount === 1 ? " is" : "s are"} in it. Move them to another collection first.`
          : "It also leaves the filter of every category that uses it. This cannot be undone."
      }
      confirmLabel="Delete collection"
      pendingLabel="Deleting…"
      pending={remove.isPending}
      confirmDisabled={collection.productCount > 0}
    >
      <FormError error={remove.error} />
    </ConfirmDialog>
  );
}

/** Collections: groups of products shared by all categories. */
export function CollectionsTab() {
  const collections = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: fetchCollections,
    staleTime: 10_000,
  });
  const [dialog, setDialog] = useState<
    | { kind: "edit"; collection: Collection | null }
    | { kind: "delete"; collection: Collection }
    | null
  >(null);
  const rows = collections.data ?? [];

  let message: string | undefined;
  if (collections.isError)
    message =
      "We couldn't load the collections. Check your connection and reload.";
  else if (collections.isPending) message = "Loading collections…";
  else if (rows.length === 0) message = "No collections yet.";

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => setDialog({ kind: "edit", collection: null })}
          className={primaryButton}
        >
          <Plus aria-hidden className="size-4" />
          Add collection
        </button>
      </div>
      <div className={tableCardClass}>
        <div className="min-h-0 flex-[0_1_auto] overflow-auto">
          <table className="w-full min-w-[32rem] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[28%]" />
              <col className="w-[14%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr>
                <th scope="col" className={headCell}>
                  Name
                </th>
                <th scope="col" className={headCell}>
                  Web address
                </th>
                <th scope="col" className={headCell}>
                  Products
                </th>
                <th scope="col" className={headCell}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((collection) => (
                <tr key={collection.id}>
                  <td className={`${bodyCell} font-medium text-foreground`}>
                    <span className="block truncate">{collection.label}</span>
                  </td>
                  <td className={`${bodyCell} text-muted-foreground`}>
                    <span className="block truncate">/{collection.slug}</span>
                  </td>
                  <td className={`${bodyCell} text-foreground`}>
                    {collection.productCount}
                  </td>
                  <td className={bodyCell}>
                    <span className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "edit", collection })}
                        className={linkButton}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDialog({ kind: "delete", collection })
                        }
                        className={dangerLinkButton}
                      >
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {message ? <TableMessage>{message}</TableMessage> : null}
        </div>
      </div>
      {dialog?.kind === "edit" ? (
        <CollectionDialog
          collection={dialog.collection}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <DeleteCollectionDialog
          collection={dialog.collection}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}
