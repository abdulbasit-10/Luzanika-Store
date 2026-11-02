import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("makes lower-case words joined by single dashes", () => {
    expect(slugify("Linen Shirt")).toBe("linen-shirt");
    expect(slugify("  Linen   —  Shirt & Trouser!! ")).toBe("linen-shirt-trouser");
  });

  it("drops accents", () => {
    expect(slugify("Café Crème")).toBe("cafe-creme");
    // Letters with no plain-letter form (like ß) act as separators.
    expect(slugify("Größe")).toBe("gro-e");
  });

  it("keeps digits", () => {
    expect(slugify("Amber No. 01")).toBe("amber-no-01");
  });

  it("is empty when nothing usable is left", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!! ---")).toBe("");
    expect(slugify("日本語")).toBe("");
  });

  it("cuts to the limit without a trailing dash", () => {
    const slug = slugify("word ".repeat(50), 20);
    expect(slug.length).toBeLessThanOrEqual(20);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("always matches the database rule", () => {
    for (const name of ["A", "a-b", "  x  ", "X_Y_Z", "50% off!", "Ünï cödé"]) {
      const slug = slugify(name);
      if (slug) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
