"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { BadgeCheck, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/utils/cn";

import {
  REVIEW_BODY_MAX,
  REVIEW_TITLE_MAX,
  reviewProblems,
  starShares,
  toReviewInput,
} from "./review-forms";
import {
  createReview,
  deleteReview,
  fetchReviews,
  updateReview,
  type OwnReview,
  type Review,
} from "./reviews-service";

const PAGE_SIZE = 5;
const STARS = [1, 2, 3, 4, 5] as const;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`${rating} out of 5 stars`}
      className={cn("flex gap-0.5", className)}
    >
      {STARS.map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            "size-4",
            n <= Math.round(rating)
              ? "fill-orange-500 text-orange-500"
              : "fill-transparent text-muted-foreground/50",
          )}
        />
      ))}
    </span>
  );
}

/** Five stars to click: a real radio group, so the keyboard and screen readers work. */
function StarInput({
  value,
  onChange,
  invalid,
}: {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
}) {
  const name = useId();
  return (
    <fieldset aria-invalid={invalid}>
      <legend className="sr-only">Your rating</legend>
      <div className="flex gap-1">
        {STARS.map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
            />
            <span className="sr-only">
              {n} {n === 1 ? "star" : "stars"}
            </span>
            <Star
              aria-hidden
              className={cn(
                "size-8 rounded transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                n <= value
                  ? "fill-orange-500 text-orange-500"
                  : "fill-transparent text-muted-foreground/50 hover:text-orange-400",
              )}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function fieldMessage(error: unknown): string | null {
  if (error instanceof ApiError) {
    return (error.fields && Object.values(error.fields)[0]) || error.message;
  }
  return error ? "Something went wrong. Please try again." : null;
}

const inputClass =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-[invalid=true]:border-danger";

/** Write a review, or change your own. */
function ReviewForm({
  slug,
  existing,
  onDone,
}: {
  slug: string;
  existing?: OwnReview;
  onDone: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [shown, setShown] = useState(false);
  const problems = reviewProblems({ rating, title, body });
  const bodyId = useId();
  const titleId = useId();

  const save = useMutation({
    mutationFn: () => {
      const input = toReviewInput({ rating, title, body });
      return existing
        ? updateReview(existing.id, input)
        : createReview(slug, input);
    },
    onSuccess: async () => {
      toast.success(
        "Thank you! Your review has been received and will appear on this page soon.",
      );
      await queryClient.invalidateQueries({ queryKey: ["reviews", slug] });
      // The stars under the product name are part of the page, so it reloads them.
      router.refresh();
      onDone();
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setShown(true);
        if (Object.keys(problems).length === 0) save.mutate();
      }}
      className="flex flex-col gap-4 rounded-xl border border-black/10 bg-panel p-5"
    >
      <h3 className="font-heading text-base font-bold">
        {existing ? "Change your review" : "Write a review"}
      </h3>
      <div>
        <StarInput
          value={rating}
          onChange={setRating}
          invalid={shown && Boolean(problems.rating)}
        />
        {shown && problems.rating ? (
          <p role="alert" className="mt-1 text-xs text-danger">
            {problems.rating}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={titleId} className="text-sm font-medium">
          Title (optional)
        </label>
        <input
          id={titleId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={REVIEW_TITLE_MAX}
          aria-invalid={shown && Boolean(problems.title)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={bodyId} className="text-sm font-medium">
          Your review
        </label>
        <textarea
          id={bodyId}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={REVIEW_BODY_MAX}
          placeholder="How is the fit, the fabric and the quality?"
          aria-invalid={shown && Boolean(problems.body)}
          aria-describedby={
            shown && problems.body ? `${bodyId}-error` : undefined
          }
          className={inputClass}
        />
        {shown && problems.body ? (
          <p
            id={`${bodyId}-error`}
            role="alert"
            className="text-xs text-danger"
          >
            {problems.body}
          </p>
        ) : null}
      </div>
      {save.error ? (
        <p role="alert" className="text-sm text-danger">
          {fieldMessage(save.error)}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending
            ? "Saving…"
            : existing
              ? "Save changes"
              : "Post review"}
        </Button>
        {existing ? (
          <Button type="button" size="sm" variant="secondary" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="border-b border-black/10 py-5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={review.rating} />
        {review.title ? (
          <h3 className="text-sm font-bold">{review.title}</h3>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 whitespace-pre-line text-foreground">
        {review.body}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
        <span>
          {review.authorName} · {dateFormat.format(new Date(review.createdAt))}
        </span>
        <span className="inline-flex items-center gap-1 text-success">
          <BadgeCheck aria-hidden className="size-3.5" />
          Verified purchase
        </span>
      </p>
    </article>
  );
}

/** Your own review, with the buttons to change or remove it. */
function MyReview({
  slug,
  review,
  onEdit,
}: {
  slug: string;
  review: OwnReview;
  onEdit: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteReview(review.id),
    onSuccess: async () => {
      toast.success("Your review was removed");
      await queryClient.invalidateQueries({ queryKey: ["reviews", slug] });
      router.refresh();
    },
  });

  return (
    <div className="rounded-xl border border-black/10 bg-panel p-5">
      <p className="text-sm font-bold">Your review</p>
      {review.status === "pending" ? (
        <p role="status" className="mt-1 text-xs text-muted-foreground">
          Thank you for sharing your feedback. Your review will appear on this
          page soon.
        </p>
      ) : null}
      {review.status === "hidden" ? (
        <p role="status" className="mt-1 text-xs text-muted-foreground">
          Our team has hidden this review, so it is not shown to others.
        </p>
      ) : null}
      <ReviewCard review={review} />
      {remove.error ? (
        <p role="alert" className="text-sm text-danger">
          {fieldMessage(remove.error)}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {review.status !== "hidden" ? (
          <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
            Change
          </Button>
        ) : null}
        {confirming ? (
          <>
            <span className="text-sm">Remove your review?</span>
            <Button
              type="button"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? "Removing…" : "Yes, remove"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setConfirming(false)}
            >
              No
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setConfirming(true)}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * The reviews of a product: the average and the star breakdown, the reviews
 * themselves, and the form for a customer whose order for it was delivered.
 */
export function ProductReviews({ slug }: { slug: string }) {
  const [editing, setEditing] = useState(false);
  const reviews = useInfiniteQuery({
    queryKey: ["reviews", slug],
    queryFn: ({ pageParam }) => fetchReviews(slug, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });

  const first = reviews.data?.pages[0];
  const last = reviews.data?.pages.at(-1);
  const items = reviews.data?.pages.flatMap((page) => page.items) ?? [];
  const viewer = last?.viewer ?? first?.viewer;
  const shares = first
    ? starShares(first.summary.distribution, first.summary.count)
    : null;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="scroll-mt-24"
    >
      <h2 id="reviews-heading" className="font-heading text-xl font-medium">
        Reviews
      </h2>

      {reviews.isPending ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Loading reviews…
        </p>
      ) : reviews.isError || !first ? (
        <p role="alert" className="mt-4 text-sm text-muted-foreground">
          We couldn&apos;t load the reviews right now.
        </p>
      ) : (
        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12">
          <div>
            {first.summary.count > 0 && first.summary.average !== null ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="font-heading text-4xl font-medium">
                    {first.summary.average.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    out of 5
                  </span>
                </p>
                <Stars rating={first.summary.average} className="mt-2" />
                <p className="mt-1 text-sm text-muted-foreground">
                  {first.summary.count}{" "}
                  {first.summary.count === 1 ? "review" : "reviews"}
                </p>
                <ul className="mt-4 flex flex-col gap-1.5">
                  {[...STARS].reverse().map((n) => (
                    <li key={n} className="flex items-center gap-2 text-xs">
                      <span className="w-10 shrink-0">{n} star</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/10">
                        <span
                          className="block h-full rounded-full bg-orange-500"
                          style={{ width: `${shares?.[n] ?? 0}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right text-muted-foreground">
                        {first.summary.distribution[n]}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {viewer?.state === "can_review" ? (
              <ReviewForm slug={slug} onDone={() => undefined} />
            ) : null}
            {viewer?.state === "already_reviewed" ? (
              editing ? (
                <ReviewForm
                  slug={slug}
                  existing={viewer.mine}
                  onDone={() => setEditing(false)}
                />
              ) : (
                <MyReview
                  slug={slug}
                  review={viewer.mine}
                  onEdit={() => setEditing(true)}
                />
              )
            ) : null}
            {viewer?.state === "sign_in" ? (
              <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                Log in to review this product if you have bought it.
                <ButtonLink
                  href={`/login?next=${encodeURIComponent(`/products/${slug}`)}`}
                  size="sm"
                  variant="secondary"
                >
                  Log in
                </ButtonLink>
              </p>
            ) : null}
            {viewer?.state === "needs_purchase" ? (
              <p className="text-sm text-muted-foreground">
                Only customers whose order for this product has been delivered
                can review it.
              </p>
            ) : null}

            {items.length > 0 ? (
              <div>
                {items
                  .filter(
                    (review) =>
                      viewer?.state !== "already_reviewed" ||
                      review.id !== viewer.mine.id,
                  )
                  .map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                {reviews.hasNextPage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-4"
                    disabled={reviews.isFetchingNextPage}
                    onClick={() => void reviews.fetchNextPage()}
                  >
                    {reviews.isFetchingNextPage
                      ? "Loading…"
                      : "Show more reviews"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
