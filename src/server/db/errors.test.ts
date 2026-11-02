import { describe, expect, it } from "vitest";

import {
  constraintOf,
  isCheckViolation,
  isForeignKeyViolation,
  isUniqueViolation,
} from "./errors";

const wrapped = (code: string, constraint = "some_constraint") => {
  const parent = Object.assign(new Error("pg"), { code, constraint });
  return Object.assign(new Error("Sequelize"), { parent });
};

describe("database error helpers", () => {
  it("recognises the three kinds of broken rule, however deeply Sequelize wrapped them", () => {
    expect(isUniqueViolation(wrapped("23505"))).toBe(true);
    expect(isForeignKeyViolation(wrapped("23503"))).toBe(true);
    expect(isCheckViolation(wrapped("23514"))).toBe(true);
    expect(
      isUniqueViolation(Object.assign(new Error("x"), { code: "23505" })),
    ).toBe(true);
  });

  it("does not mistake one kind for another", () => {
    expect(isUniqueViolation(wrapped("23503"))).toBe(false);
    expect(isForeignKeyViolation(wrapped("23505"))).toBe(false);
    expect(isCheckViolation(wrapped("23505"))).toBe(false);
  });

  it("finds the name of the broken constraint", () => {
    expect(constraintOf(wrapped("23505", "products_slug_key"))).toBe(
      "products_slug_key",
    );
    expect(constraintOf(new Error("plain"))).toBeUndefined();
  });

  it("is safe with values that are not errors", () => {
    for (const value of [null, undefined, "text", 42, {}]) {
      expect(isUniqueViolation(value)).toBe(false);
      expect(constraintOf(value)).toBeUndefined();
    }
  });
});
