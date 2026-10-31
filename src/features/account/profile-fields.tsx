"use client";

import { ChevronDown, Pencil } from "lucide-react";
import type { ComponentProps, FormEventHandler, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const controlBase =
  "h-[clamp(1.75rem,5.2dvh,2.5rem)] w-full rounded-md border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-danger";

/** Height of the buttons next to the fields, so they scale with the inputs. */
export const profileButtonClass = "h-[clamp(1.75rem,5.2dvh,2.5rem)] py-0";

/** Input and select look: a plain outline while reading, a darker one while editing. */
export const profileControlClass = (editing: boolean) =>
  cn(controlBase, editing ? "border-foreground/40" : "border-border");

export const profileLabelClass = "text-xs font-normal text-muted-foreground";

/** Native select with a custom chevron. It is disabled (but still readable) outside edit mode. */
export function ProfileSelect({
  editing,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { editing: boolean }) {
  return (
    <span className="relative block">
      <select
        disabled={!editing}
        className={cn(
          profileControlClass(editing),
          "appearance-none pr-9 disabled:opacity-100",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}

interface EditableSectionProps {
  title: string;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

/** A form section with an Edit button that turns into Cancel and Save while editing. */
export function EditableSection({
  title,
  editing,
  saving,
  onEdit,
  onCancel,
  onSubmit,
  children,
}: EditableSectionProps) {
  return (
    <form noValidate onSubmit={onSubmit} aria-label={title}>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {editing ? (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={onCancel}
              className="rounded-md border-0 bg-black/[0.06] px-3 py-1.5 text-xs font-medium hover:bg-black/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            aria-label={`Edit ${title.toLowerCase()}`}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Pencil aria-hidden className="size-3" />
            Edit
          </Button>
        )}
      </div>
      <div className="mt-2 grid gap-x-4 gap-y-[clamp(0.5rem,1.6dvh,0.75rem)] sm:grid-cols-2">
        {children}
      </div>
    </form>
  );
}
