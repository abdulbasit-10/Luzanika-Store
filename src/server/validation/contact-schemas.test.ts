import { describe, expect, it } from "vitest";

import { contactSchema } from "./contact-schemas";

const valid = {
  name: "Ada Lovelace",
  email: "Ada@Example.com",
  phone: "+92 300 1234567",
  message: "Hello,\nDo you ship to Lahore?",
};

describe("contactSchema", () => {
  it("accepts a normal message and tidies the email", () => {
    const parsed = contactSchema.parse(valid);

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.message).toContain("\n");
  });

  it("allows the phone number to be left empty", () => {
    expect(contactSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
  });

  it("refuses an empty name or message", () => {
    expect(contactSchema.safeParse({ ...valid, name: "  " }).success).toBe(
      false,
    );
    expect(contactSchema.safeParse({ ...valid, message: "" }).success).toBe(
      false,
    );
  });

  it("refuses a bad email or phone number", () => {
    expect(contactSchema.safeParse({ ...valid, email: "nope" }).success).toBe(
      false,
    );
    expect(contactSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(
      false,
    );
  });

  it("refuses a message over 2000 characters", () => {
    expect(
      contactSchema.safeParse({ ...valid, message: "a".repeat(2001) }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({ ...valid, message: "a".repeat(2000) }).success,
    ).toBe(true);
  });

  it("refuses control characters (but not line breaks)", () => {
    expect(
      contactSchema.safeParse({ ...valid, name: "Ada\r\nBcc: x@example.com" })
        .success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({ ...valid, message: "hi\u0000there" }).success,
    ).toBe(false);
  });

  it("refuses fields it does not know", () => {
    expect(
      contactSchema.safeParse({ ...valid, to: "evil@example.com" }).success,
    ).toBe(false);
  });
});
