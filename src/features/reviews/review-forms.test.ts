import { describe, expect, it } from "vitest";

import { reviewProblems, starShares, toReviewInput } from "./review-forms";

const ok = { rating: 4, title: "", body: "Lovely fabric, true to size." };

describe("reviewProblems", () => {
  it("accepts a rating and a few words", () => {
    expect(reviewProblems(ok)).toEqual({});
  });

  it("needs 1 to 5 stars", () => {
    expect(reviewProblems({ ...ok, rating: 0 }).rating).toBeTruthy();
    expect(reviewProblems({ ...ok, rating: 6 }).rating).toBeTruthy();
    expect(reviewProblems({ ...ok, rating: 2.5 }).rating).toBeTruthy();
  });

  it("needs at least 10 characters of text, and at most 2000", () => {
    expect(reviewProblems({ ...ok, body: "Nice" }).body).toBeTruthy();
    expect(reviewProblems({ ...ok, body: " ".repeat(30) }).body).toBeTruthy();
    expect(reviewProblems({ ...ok, body: "x".repeat(2001) }).body).toBeTruthy();
  });

  it("keeps the title under 80 characters", () => {
    expect(reviewProblems({ ...ok, title: "t".repeat(81) }).title).toBeTruthy();
  });
});

describe("toReviewInput", () => {
  it("trims and turns an empty title into null", () => {
    expect(
      toReviewInput({ rating: 5, title: "  ", body: "  Great fit  " }),
    ).toEqual({
      rating: 5,
      title: null,
      body: "Great fit",
    });
  });
});

describe("starShares", () => {
  it("gives percentages of all reviews", () => {
    expect(starShares({ 1: 0, 2: 1, 3: 0, 4: 1, 5: 2 }, 4)).toEqual({
      1: 0,
      2: 25,
      3: 0,
      4: 25,
      5: 50,
    });
  });

  it("is all zero without reviews", () => {
    expect(starShares({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, 0)[5]).toBe(0);
  });
});
