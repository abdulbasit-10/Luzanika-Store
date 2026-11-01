import { describe, expect, it } from "vitest";

import { avatarUrlFor, toUserDto } from "@/server/dto/user";
import type { CustomerRecord } from "@/server/repositories/customer-repository";

import { deleteAccountSchema, updateProfileSchema } from "./account-schemas";

function parse(body: unknown) {
  return updateProfileSchema.safeParse(body);
}
function fieldsOf(body: unknown): string[] {
  const result = parse(body);
  // A field can have several problems; report each field once.
  return result.success
    ? []
    : [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
}

describe("updateProfileSchema", () => {
  it("accepts any subset of the editable fields", () => {
    expect(parse({}).success).toBe(true);
    expect(parse({ firstName: "Ada" }).success).toBe(true);
    expect(
      parse({ language: "de", gender: "female", phone: "+49 170 1234567" })
        .success,
    ).toBe(true);
  });

  it("turns empty text into null so optional fields can be cleared", () => {
    const result = parse({ phone: "", gender: "", dateOfBirth: "" });
    expect(result.success && result.data).toEqual({
      phone: null,
      gender: null,
      dateOfBirth: null,
    });
  });

  it("normalises the email and names", () => {
    const result = parse({
      email: "  Ada@Example.COM ",
      firstName: "  Ada ",
      lastName: " Lovelace ",
    });
    expect(result.success && result.data).toMatchObject({
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("refuses fields that are not editable, so nobody can set their own status or role", () => {
    for (const extra of [
      { status: "active" },
      { isAdmin: true },
      { id: "x" },
      { passwordHash: "x" },
      { emailVerifiedAt: "2020-01-01" },
      { avatarKey: "x" },
    ]) {
      expect(
        parse({ firstName: "Ada", ...extra }).success,
        JSON.stringify(extra),
      ).toBe(false);
    }
  });

  it("validates each field", () => {
    expect(fieldsOf({ firstName: "" })).toEqual(["firstName"]);
    expect(fieldsOf({ lastName: "x".repeat(51) })).toEqual(["lastName"]);
    expect(fieldsOf({ firstName: "Ada\u0000" })).toEqual(["firstName"]);
    expect(fieldsOf({ email: "nope" })).toEqual(["email"]);
    expect(fieldsOf({ gender: "robot" })).toEqual(["gender"]);
    expect(fieldsOf({ language: "fr" })).toEqual(["language"]);
    expect(fieldsOf({ phone: "123" })).toEqual(["phone"]);
    expect(fieldsOf({ phone: "call me maybe" })).toEqual(["phone"]);
  });

  it("keeps the phone number within the database limit of 20 characters", () => {
    expect(parse({ phone: "+" + "1".repeat(19) }).success).toBe(true);
    expect(parse({ phone: "+" + "1".repeat(20) }).success).toBe(false);
    expect(parse({ phone: "1".repeat(19) }).success).toBe(true);
    expect(parse({ phone: "1".repeat(20) }).success).toBe(false);
  });

  it("only accepts real dates of birth that are not in the future", () => {
    expect(parse({ dateOfBirth: "1990-05-17" }).success).toBe(true);
    for (const bad of [
      "1990-02-30",
      "1899-01-01",
      "2999-01-01",
      "17/05/1990",
      "yesterday",
    ]) {
      expect(fieldsOf({ dateOfBirth: bad }), bad).toEqual(["dateOfBirth"]);
    }
  });
});

describe("deleteAccountSchema", () => {
  it("needs the password and nothing else", () => {
    expect(deleteAccountSchema.safeParse({ password: "x" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({}).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ password: "" }).success).toBe(false);
    expect(
      deleteAccountSchema.safeParse({ password: "x", confirm: true }).success,
    ).toBe(false);
  });
});

describe("toUserDto", () => {
  const base: CustomerRecord = {
    id: "id-1",
    email: "ada@example.com",
    emailVerifiedAt: null,
    passwordHash: "$2b$12$secret",
    firstName: "Ada",
    lastName: "Lovelace",
    phone: null,
    gender: null,
    dateOfBirth: null,
    language: "en",
    avatarKey: null,
    status: "active",
    lastLoginAt: null,
    createdAt: new Date(),
  };

  it("never includes the hash, status or storage key", () => {
    const dto = toUserDto({
      ...base,
      avatarKey: "avatars/0123456789abcdef0123456789abcdef.webp",
    });
    const text = JSON.stringify(dto);
    expect(text).not.toMatch(
      /passwordHash|\$2b\$|status|avatarKey|avatars\/|0123456789abcdef0123456789abcdef/,
    );
  });

  it("links to the photo route with a version that changes with the photo", () => {
    const a = avatarUrlFor("avatars/aaaaaaaaaaaa11112222333344445555.webp");
    const b = avatarUrlFor("avatars/bbbbbbbbbbbb11112222333344445555.webp");
    expect(a).toBe("/api/v1/account/avatar?v=aaaaaaaaaaaa");
    expect(a).not.toBe(b);
    expect(toUserDto(base)).not.toHaveProperty("avatarUrl");
  });
});
