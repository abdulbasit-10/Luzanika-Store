import { describe, expect, it } from "vitest";

import {
  basicsProblems,
  minorToText,
  notesFromText,
  readPrice,
  sectionProblems,
  variantBody,
  variantProblems,
} from "./product-forms";

describe("readPrice", () => {
  it("treats two empty fields as not sold in that market", () => {
    expect(readPrice({ amount: "", compareAt: "" }).price).toBeNull();
  });

  it("turns the typed amount into paisa or cents", () => {
    expect(readPrice({ amount: "1,200", compareAt: "" }).price).toEqual({
      amount: 120000,
      compareAtAmount: null,
    });
    expect(readPrice({ amount: "49.90", compareAt: "59.9" }).price).toEqual({
      amount: 4990,
      compareAtAmount: 5990,
    });
  });

  it("asks for a price when only the old price is filled", () => {
    expect(readPrice({ amount: "", compareAt: "100" }).problems.amount).toBe(
      "Enter the price",
    );
  });

  it("refuses an old price that is not higher", () => {
    const { price, problems } = readPrice({ amount: "100", compareAt: "100" });
    expect(price).toBeNull();
    expect(problems.compareAt).toMatch(/higher/);
  });

  it("refuses text that is not an amount", () => {
    expect(readPrice({ amount: "abc", compareAt: "" }).problems.amount).toMatch(
      /number/,
    );
  });
});

describe("minorToText", () => {
  it("writes whole amounts without cents", () => {
    expect(minorToText(89000)).toBe("890");
    expect(minorToText(4990)).toBe("49.90");
    expect(minorToText(null)).toBe("");
  });
});

describe("basicsProblems", () => {
  const ok = { name: "Tee", slug: "", tagline: "", badgeLabel: "", notes: "" };

  it("accepts a name alone", () => {
    expect(basicsProblems(ok)).toEqual({});
  });

  it("needs a name and a clean slug", () => {
    expect(basicsProblems({ ...ok, name: " " }).name).toBeTruthy();
    expect(basicsProblems({ ...ok, slug: "Bad Slug" }).slug).toBeTruthy();
    expect(basicsProblems({ ...ok, slug: "good-slug-2" }).slug).toBeUndefined();
  });

  it("limits the notes", () => {
    expect(notesFromText("a\n\n b \n")).toEqual(["a", "b"]);
    expect(basicsProblems({ ...ok, notes: "a\na" }).notes).toMatch(/once/);
    expect(
      basicsProblems({
        ...ok,
        notes: Array(11)
          .fill("x")
          .map((x, i) => x + i)
          .join("\n"),
      }).notes,
    ).toMatch(/10/);
  });
});

describe("variantProblems", () => {
  const ok = {
    sku: "TEE-BLK-M",
    colorName: "Black",
    colorHex: "#000000",
    sizeLabel: "M",
    stockPK: "10",
    stockDE: "",
  };

  it("accepts a complete variant", () => {
    expect(variantProblems(ok)).toEqual({});
  });

  it("needs a SKU in the allowed characters", () => {
    expect(variantProblems({ ...ok, sku: "" }).sku).toBeTruthy();
    expect(variantProblems({ ...ok, sku: "a b" }).sku).toBeTruthy();
  });

  it("wants a colour name and its code together", () => {
    expect(variantProblems({ ...ok, colorHex: "" }).colorHex).toMatch(/both/);
    expect(variantProblems({ ...ok, colorName: "" }).colorHex).toMatch(/both/);
    expect(variantProblems({ ...ok, colorName: "", colorHex: "" })).toEqual({});
    expect(variantProblems({ ...ok, colorHex: "red" }).colorHex).toMatch(
      /#1a2b3c/,
    );
  });

  it("wants whole numbers of stock, and an empty box means none", () => {
    expect(variantProblems({ ...ok, stockPK: "-1" }).stockPK).toBeTruthy();
    expect(variantProblems({ ...ok, stockDE: "2.5" }).stockDE).toBeTruthy();
    expect(variantBody(ok).stock).toEqual({ PK: 10, DE: 0 });
  });
});

describe("sectionProblems", () => {
  it("accepts filled sections", () => {
    expect(sectionProblems([{ title: "Fabric", body: "Cotton" }])).toBeNull();
  });

  it("points at the first section that is incomplete", () => {
    expect(
      sectionProblems([
        { title: "Fabric", body: "Cotton" },
        { title: "Care", body: " " },
      ]),
    ).toEqual({ index: 1, message: "Give every section a title and a text" });
  });
});
