"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  DetailCard,
  FormError,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import { setSections, type Product } from "./admin-products-service";
import { sectionProblems, type SectionText } from "./product-forms";
import { useProductMutation } from "./product-mutation";

const MAX_SECTIONS = 12;

const iconButton =
  "flex size-8 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40";

/** The folding "Fabric", "Care", "Delivery" blocks of the product page, in order. */
export function ProductSectionsCard({
  product,
  canEdit,
}: {
  product: Product;
  canEdit: boolean;
}) {
  const [sections, setSections_] = useState<SectionText[]>(
    product.sections.map(({ title, body }) => ({ title, body })),
  );
  const [shown, setShown] = useState(false);
  const problem = sectionProblems(sections);

  const save = useProductMutation(
    product.id,
    () =>
      setSections(
        product.id,
        sections.map((section) => ({
          title: section.title.trim(),
          body: section.body.trim(),
        })),
      ),
    "Details saved",
  );

  const update = (index: number, patch: Partial<SectionText>) =>
    setSections_((current) =>
      current.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    );
  const swap = (index: number, to: number) =>
    setSections_((current) => {
      const next = [...current];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  return (
    <DetailCard
      title="Details on the product page"
      action={
        canEdit && sections.length < MAX_SECTIONS ? (
          <button
            type="button"
            onClick={() =>
              setSections_((current) => [...current, { title: "", body: "" }])
            }
            className={secondaryButton}
          >
            <Plus aria-hidden className="size-4" />
            Add section
          </button>
        ) : null
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setShown(true);
          if (!problem) save.mutate(undefined);
        }}
        className="flex flex-col gap-3"
      >
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sections. Add one for fabric, care or delivery.
          </p>
        ) : null}
        {sections.map((section, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={section.title}
                onChange={(e) => update(index, { title: e.target.value })}
                placeholder="Title, e.g. Fabric & care"
                maxLength={80}
                disabled={!canEdit}
                aria-label={`Title of section ${index + 1}`}
                aria-invalid={shown && problem?.index === index}
                className={inputClass}
              />
              {canEdit ? (
                <>
                  <button
                    type="button"
                    aria-label="Move section up"
                    disabled={index === 0}
                    onClick={() => swap(index, index - 1)}
                    className={iconButton}
                  >
                    <ArrowUp aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move section down"
                    disabled={index === sections.length - 1}
                    onClick={() => swap(index, index + 1)}
                    className={iconButton}
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove section"
                    onClick={() =>
                      setSections_((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    className={cn(iconButton, "text-danger")}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </>
              ) : null}
            </div>
            <textarea
              value={section.body}
              onChange={(e) => update(index, { body: e.target.value })}
              rows={3}
              maxLength={4000}
              disabled={!canEdit}
              aria-label={`Text of section ${index + 1}`}
              aria-invalid={shown && problem?.index === index}
              className={cn(inputClass, "h-auto py-2")}
            />
            {shown && problem?.index === index ? (
              <p role="alert" className="text-xs text-danger">
                {problem.message}
              </p>
            ) : null}
          </div>
        ))}
        <FormError error={save.error} />
        {canEdit ? (
          <div>
            <button
              type="submit"
              disabled={save.isPending}
              className={primaryButton}
            >
              {save.isPending ? "Saving…" : "Save details"}
            </button>
          </div>
        ) : null}
      </form>
    </DetailCard>
  );
}
