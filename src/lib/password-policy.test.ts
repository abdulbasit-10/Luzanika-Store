import { describe, expect, it } from "vitest";

import { isCommonPassword } from "./common-passwords";
import {
  findPasswordProblem,
  newPasswordSchema,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
} from "./password-policy";

describe("findPasswordProblem", () => {
  it("accepts a reasonable password", () => {
    expect(findPasswordProblem("correct horse battery")).toBeNull();
    expect(findPasswordProblem("kT9#pLm")).toBeNull();
  });

  it("requires the minimum length, counted in characters", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(6);
    expect(findPasswordProblem("abcde")).toBe("tooShort");
    expect(findPasswordProblem("")).toBe("required");
    // one emoji is one character, not two
    expect(findPasswordProblem("😀😀😀😀😀")).toBe("tooShort");
    expect(findPasswordProblem("😀😁😂🤣😃😄")).toBeNull();
  });

  it("refuses passwords bcrypt would silently cut (more than 72 bytes)", () => {
    expect(findPasswordProblem("x7".repeat(36))).toBeNull(); // 72 bytes
    expect(findPasswordProblem("x7".repeat(36) + "a")).toBe("tooLong");
    // 25 three-byte characters = 75 bytes but only 25 characters
    expect(findPasswordProblem("€".repeat(25))).toBe("tooLong");
    expect(PASSWORD_MAX_BYTES).toBe(72);
  });

  it("refuses common passwords whatever the capitals", () => {
    for (const password of [
      "password",
      "PASSWORD",
      "Qwerty123",
      "123456",
      "iloveyou",
    ]) {
      expect(findPasswordProblem(password)).toBe("common");
    }
  });

  it("refuses one repeated character", () => {
    expect(findPasswordProblem("zzzzzzzz")).toBe("common");
  });

  it("refuses the email as password", () => {
    expect(findPasswordProblem("Ada@Example.com", "ada@example.com")).toBe(
      "sameAsEmail",
    );
    expect(findPasswordProblem("something-else", "ada@example.com")).toBeNull();
  });

  it("imposes no composition rules", () => {
    expect(findPasswordProblem("onlylowercaseletters")).toBeNull();
  });
});

describe("isCommonPassword", () => {
  it("matches the blocklist case-insensitively", () => {
    expect(isCommonPassword("LuZaNiKa123")).toBe(true);
    expect(isCommonPassword("a-very-unlikely-pass")).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("reports the policy message", () => {
    const result = newPasswordSchema.safeParse("abc");
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toMatch(/at least 6/i);
  });
});
