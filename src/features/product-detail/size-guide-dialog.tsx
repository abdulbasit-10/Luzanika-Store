"use client";

import { Ruler, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import {
  getSizeGuide,
  sizeGuideColumns,
  type SizeGuide,
} from "@/features/product-detail/size-guide-data";
import { cn } from "@/utils/cn";

type Unit = "cm" | "in";

const UNITS: Unit[] = ["cm", "in"];
const CM_PER_INCH = 2.54;

function formatMeasurement(centimetres: number, unit: Unit) {
  return unit === "cm"
    ? String(centimetres)
    : (centimetres / CM_PER_INCH).toFixed(1);
}

/** "Size guide" link that opens the size chart for the product's audience. */
export function SizeGuideButton({ category }: { category?: string }) {
  const guide = getSizeGuide(category);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // The page behind the modal should not scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!guide) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
        className="flex items-center gap-2 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <Ruler aria-hidden className="size-4" />
        Size guide
      </button>
      <SizeGuideDialog
        ref={dialogRef}
        guide={guide}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function SizeGuideDialog({
  ref,
  guide,
  onClose,
}: {
  ref: React.Ref<HTMLDialogElement>;
  guide: SizeGuide;
  onClose: () => void;
}) {
  const titleId = useId();
  const [unit, setUnit] = useState<Unit>("cm");

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself, not on its content.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[800px] overflow-y-auto rounded-xl bg-white font-normal tracking-normal text-foreground normal-case shadow-overlay backdrop:bg-black/50"
    >
      <div className="relative px-5 pt-8 pb-6 sm:px-10 sm:pt-9 sm:pb-7">
        <button
          type="button"
          aria-label="Close size guide"
          onClick={(event) => event.currentTarget.closest("dialog")?.close()}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X aria-hidden className="size-4" />
        </button>

        <div className="text-center">
          <h2
            id={titleId}
            className="font-heading text-base font-bold tracking-[0.2em] uppercase"
          >
            Size Chart
          </h2>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <p>All measurements based off of {unit}.</p>
            <div
              role="group"
              aria-label="Measurement unit"
              className="flex rounded-sm border border-border p-px"
            >
              {UNITS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={unit === value}
                  onClick={() => setUnit(value)}
                  className={cn(
                    "rounded-[3px] px-2 py-0.5 text-[10px] font-semibold uppercase focus-visible:outline-2 focus-visible:outline-ring",
                    unit === value
                      ? "bg-foreground text-white"
                      : "hover:bg-muted",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-8 sm:mt-7">
          <div className="relative hidden h-[clamp(11rem,38dvh,20rem)] w-[38%] shrink-0 overflow-hidden rounded-sm bg-muted sm:block">
            <Image
              src={guide.image.src}
              alt={guide.image.alt}
              fill
              sizes="300px"
              className="object-cover"
            />
          </div>

          <table className="w-full text-center text-xs">
            <caption className="sr-only">
              Garment measurements in {unit === "cm" ? "centimetres" : "inches"}
            </caption>
            <thead>
              <tr className="border-b border-black/20">
                <th
                  scope="col"
                  className="py-2.5 text-left font-heading text-[10px] font-bold tracking-[0.12em] uppercase"
                >
                  Size
                </th>
                {sizeGuideColumns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="py-2.5 font-heading text-[10px] font-bold tracking-[0.12em] uppercase"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {guide.rows.map((row) => (
                <tr
                  key={row.size}
                  className="border-b border-black/10 hover:bg-muted/60"
                >
                  <th
                    scope="row"
                    className="py-2.5 pr-2 text-left font-normal whitespace-nowrap text-foreground"
                  >
                    {row.size}
                  </th>
                  {row.measurements.map((value, index) => (
                    <td key={sizeGuideColumns[index]} className="py-2.5">
                      {formatMeasurement(value, unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Dimensions are exact circumference measurements taken whilst product
          is laid flat.
        </p>
      </div>
    </dialog>
  );
}
