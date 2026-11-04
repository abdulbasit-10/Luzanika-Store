import { describe, expect, it } from "vitest";

import { orderProgress } from "./order-progress";

const states = (status: Parameters<typeof orderProgress>[0]) =>
  orderProgress(status)?.map((step) => step.state);

describe("orderProgress", () => {
  it("starts on the first step while payment is awaited", () => {
    expect(states("waiting_payment")).toEqual([
      "current",
      "todo",
      "todo",
      "todo",
    ]);
  });

  it("marks the earlier steps done and the next ones still to come", () => {
    expect(states("processing")).toEqual(["done", "current", "todo", "todo"]);
    expect(states("in_delivery")).toEqual(["done", "done", "current", "todo"]);
  });

  it("shows every step done once the order is completed", () => {
    expect(states("completed")).toEqual(["done", "done", "done", "done"]);
  });

  it("has no steps for an order that was cancelled or refunded", () => {
    expect(orderProgress("cancelled")).toBeNull();
    expect(orderProgress("refunded")).toBeNull();
  });
});
