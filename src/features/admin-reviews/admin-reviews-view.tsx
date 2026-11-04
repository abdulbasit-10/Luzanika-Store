"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChevronDown, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { dateTimeFormat } from "@/features/admin-orders/order-detail-ui";
import { OrdersPagination } from "@/features/admin-orders/orders-table";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import {
  Field,
  FormError,
  SearchBox,
  TableMessage,
  bodyCell,
  filterBarClass,
  filterBoxClass,
  headCell,
  inputClass,
  tableCardClass,
  useDebounced,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import {
  fetchReviews,
  hideReview,
  restoreReview,
  type AdminReview,
  type ReviewStatus,
} from "./admin-reviews-service";

const PAGE_SIZE = 10;

function StarsLine({ rating }: { rating: number }) {
  return (
    <span
      role="img"
      aria-label={`${rating} out of 5 stars`}
      className="flex gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            "size-3.5",
            n <= rating
              ? "fill-orange-500 text-orange-500"
              : "fill-transparent text-muted-foreground/50",
          )}
        />
      ))}
    </span>
  );
}

function useReviewChange<V>(
  run: (variables: V) => Promise<unknown>,
  message: string,
  onDone: () => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      toast.success(message);
      onDone();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
      ]);
    },
  });
}

function HideDialog({
  review,
  onClose,
}: {
  review: AdminReview;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [shown, setShown] = useState(false);
  const problem = reason.trim() ? undefined : "Please give a reason";
  const hide = useReviewChange(
    () => hideReview(review.id, reason),
    "Review hidden",
    onClose,
  );
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (!problem) hide.mutate(undefined);
      }}
      title="Hide this review?"
      description={`It disappears from ${review.product.name} and from its star rating. Nothing is deleted and you can show it again. The reason is kept in the audit log.`}
      confirmLabel="Hide review"
      pendingLabel="Hiding…"
      pending={hide.isPending}
    >
      <Field
        id="hide-reason"
        label="Reason"
        error={shown ? problem : undefined}
      >
        <textarea
          id="hide-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={300}
          rows={2}
          aria-invalid={shown && Boolean(problem)}
          aria-describedby="hide-reason-error"
          className={cn(inputClass, "h-auto py-2")}
        />
      </Field>
      <FormError error={hide.error} />
    </ConfirmDialog>
  );
}

function RestoreDialog({
  review,
  onClose,
}: {
  review: AdminReview;
  onClose: () => void;
}) {
  const restore = useReviewChange(
    () => restoreReview(review.id),
    "Review shown again",
    onClose,
  );
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => restore.mutate(undefined)}
      title="Show this review again?"
      description={`It appears on ${review.product.name} again and counts in its star rating.`}
      confirmLabel="Show review"
      pendingLabel="Saving…"
      pending={restore.isPending}
    >
      <FormError error={restore.error} />
    </ConfirmDialog>
  );
}

const linkButton =
  "text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Reviews: what customers wrote, newest first. Staff can hide one (and show it again). */
export function AdminReviewsView() {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{
    kind: "hide" | "restore";
    review: AdminReview;
  } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const settled = useDebounced(search);

  const filters = {
    search: settled || undefined,
    status: status || undefined,
    rating: rating ? Number(rating) : undefined,
  };
  const reviews = useQuery({
    queryKey: ["admin", "reviews", filters, page],
    queryFn: () => fetchReviews(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: can("reviews.view"),
    staleTime: 10_000,
  });
  const rows = reviews.data?.items ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((reviews.data?.total ?? 0) / PAGE_SIZE),
  );

  let message: string | undefined;
  if (reviews.isError && rows.length === 0)
    message =
      "We couldn't load the reviews. Check your connection and try again.";
  else if (reviews.isPending) message = "Loading reviews…";
  else if (rows.length === 0) message = "No reviews match these filters.";

  const select = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: [string, string][],
    className: string,
  ) => (
    <label className={cn(filterBoxClass, "relative", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setPage(1);
        }}
        className="h-full w-full cursor-pointer appearance-none rounded-[9px] bg-transparent pr-9 pl-3.5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground"
      />
    </label>
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <AdminPageHead
        title="Reviews"
        subtitle="What customers who received a product wrote about it."
      />
      {can("reviews.view") ? (
        <>
          <div className={filterBarClass}>
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.1vw,0.85rem)] lg:grid-cols-12">
              <SearchBox
                label="Search the text, author or product"
                placeholder="Search the text, author or product"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                className="col-span-2 lg:col-span-6"
              />
              {select(
                "Status",
                status,
                (value) => setStatus(value as ReviewStatus | ""),
                [
                  ["", "All reviews"],
                  ["published", "Shown"],
                  ["hidden", "Hidden"],
                ],
                "lg:col-span-3",
              )}
              {select(
                "Stars",
                rating,
                setRating,
                [
                  ["", "Any rating"],
                  ["5", "5 stars"],
                  ["4", "4 stars"],
                  ["3", "3 stars"],
                  ["2", "2 stars"],
                  ["1", "1 star"],
                ],
                "lg:col-span-3",
              )}
            </div>
          </div>
          <div
            className={cn(
              tableCardClass,
              reviews.isFetching && !reviews.isPending && "opacity-80",
            )}
          >
            <div className="min-h-0 flex-[0_1_auto] overflow-auto">
              <table className="w-full min-w-[52rem] table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[12%]" />
                  <col className="w-[40%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th scope="col" className={headCell}>
                      Product
                    </th>
                    <th scope="col" className={headCell}>
                      Stars
                    </th>
                    <th scope="col" className={headCell}>
                      Review
                    </th>
                    <th scope="col" className={headCell}>
                      Status
                    </th>
                    <th scope="col" className={headCell}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((review) => {
                    const expanded = open === review.id;
                    return (
                      <tr key={review.id} className="align-top">
                        <td className={cn(bodyCell, "h-auto py-2")}>
                          <Link
                            href={`/admin/products/${review.product.id}`}
                            className="block truncate font-medium text-foreground underline-offset-2 hover:underline"
                          >
                            {review.product.name}
                          </Link>
                          <span className="block truncate text-xs text-muted-foreground">
                            {dateTimeFormat.format(new Date(review.createdAt))}
                          </span>
                        </td>
                        <td className={cn(bodyCell, "h-auto py-2")}>
                          <StarsLine rating={review.rating} />
                        </td>
                        <td
                          className={cn(
                            bodyCell,
                            "h-auto py-2 text-foreground",
                          )}
                        >
                          {review.title ? (
                            <p className="font-medium">{review.title}</p>
                          ) : null}
                          <p
                            className={cn(
                              "text-sm whitespace-pre-line",
                              !expanded && "line-clamp-2",
                            )}
                          >
                            {review.body}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {review.authorName}
                            {review.customer
                              ? ` · ${review.customer.email}`
                              : ""}
                            {review.status === "hidden" && review.hiddenReason
                              ? ` · hidden: “${review.hiddenReason}”${review.hiddenBy ? ` by ${review.hiddenBy}` : ""}`
                              : ""}
                          </p>
                          {review.body.length > 120 || review.title ? (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              onClick={() =>
                                setOpen(expanded ? null : review.id)
                              }
                              className={cn(linkButton, "mt-0.5 text-xs")}
                            >
                              {expanded ? "Show less" : "Show all"}
                            </button>
                          ) : null}
                        </td>
                        <td className={cn(bodyCell, "h-auto py-2")}>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                              review.status === "published"
                                ? "border-[#279f51]/10 bg-[#279f51]/10 text-success"
                                : "border-danger/10 bg-[#feeff2] text-danger",
                            )}
                          >
                            {review.status === "published" ? "Shown" : "Hidden"}
                          </span>
                        </td>
                        <td className={cn(bodyCell, "h-auto py-2")}>
                          {can("reviews.moderate") ? (
                            review.status === "published" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setDialog({ kind: "hide", review })
                                }
                                className="text-sm font-medium text-danger underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                              >
                                Hide
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setDialog({ kind: "restore", review })
                                }
                                className={linkButton}
                              >
                                Show again
                              </button>
                            )
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {message ? <TableMessage>{message}</TableMessage> : null}
            </div>
            <OrdersPagination
              page={Math.min(page, totalPages)}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your role does not include reviews.
        </p>
      )}
      {dialog?.kind === "hide" ? (
        <HideDialog review={dialog.review} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "restore" ? (
        <RestoreDialog review={dialog.review} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}
