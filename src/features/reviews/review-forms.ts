export interface ReviewText {
  rating: number;
  title: string;
  body: string;
}

export type ReviewProblems = Partial<Record<keyof ReviewText, string>>;

export const REVIEW_BODY_MIN = 10;
export const REVIEW_BODY_MAX = 2000;
export const REVIEW_TITLE_MAX = 80;

export function reviewProblems(values: ReviewText): ReviewProblems {
  const problems: ReviewProblems = {};
  if (
    !Number.isInteger(values.rating) ||
    values.rating < 1 ||
    values.rating > 5
  ) {
    problems.rating = "Please choose 1 to 5 stars";
  }
  if (values.title.trim().length > REVIEW_TITLE_MAX) {
    problems.title = `Please keep the title under ${REVIEW_TITLE_MAX} characters`;
  }
  const body = values.body.trim();
  if (body.length < REVIEW_BODY_MIN) {
    problems.body = `Please write at least ${REVIEW_BODY_MIN} characters`;
  } else if (body.length > REVIEW_BODY_MAX) {
    problems.body = `Please keep your review under ${REVIEW_BODY_MAX} characters`;
  }
  return problems;
}

/** What the API takes: an empty title becomes null. */
export const toReviewInput = (values: ReviewText) => ({
  rating: values.rating,
  title: values.title.trim() || null,
  body: values.body.trim(),
});

/** Share of each star rating in percent of all reviews (0 when there are none). */
export function starShares(
  distribution: Record<1 | 2 | 3 | 4 | 5, number>,
  count: number,
): Record<1 | 2 | 3 | 4 | 5, number> {
  const share = (n: number) =>
    count === 0 ? 0 : Math.round((n / count) * 100);
  return {
    1: share(distribution[1]),
    2: share(distribution[2]),
    3: share(distribution[3]),
    4: share(distribution[4]),
    5: share(distribution[5]),
  };
}
