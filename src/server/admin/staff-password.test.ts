import { describe, expect, it } from "vitest";

import {
  findStaffPasswordProblem,
  STAFF_PASSWORD_MESSAGES,
  STAFF_PASSWORD_MIN_LENGTH,
} from "./staff-password";

describe("findStaffPasswordProblem", () => {
  it("asks for more characters than a customer password", () => {
    expect(STAFF_PASSWORD_MIN_LENGTH).toBe(12);
    // Fine for a customer (6+), too short for staff.
    expect(findStaffPasswordProblem("Fj7!qPz")).toBe("tooShort");
    expect(findStaffPasswordProblem("Fj7!qPzwK3x")).toBe("tooShort");
    expect(findStaffPasswordProblem("Fj7!qPzwK3xN")).toBeNull();
  });

  it("still applies the common rules", () => {
    expect(findStaffPasswordProblem("")).toBe("required");
    expect(findStaffPasswordProblem("password1234")).toBe("common");
    expect(
      findStaffPasswordProblem(
        "ada.lovelace@example.com",
        "ada.lovelace@example.com",
      ),
    ).toBe("sameAsEmail");
    expect(findStaffPasswordProblem("x".repeat(80))).toBe("tooLong");
  });

  it("explains the minimum in words", () => {
    expect(STAFF_PASSWORD_MESSAGES.tooShort).toContain("12");
  });
});
