import { describe, expect, it } from "vitest";

import { groupPermissions, personProblems, roleProblems } from "./staff-forms";

const person = {
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
};

describe("personProblems", () => {
  it("accepts a complete person", () => {
    expect(personProblems(person, true)).toEqual({});
  });

  it("checks the email only when asked", () => {
    expect(
      personProblems({ ...person, email: "nope" }, true).email,
    ).toBeTruthy();
    expect(personProblems({ ...person, email: "" }, false)).toEqual({});
  });

  it("needs both names", () => {
    const problems = personProblems(
      { ...person, firstName: " ", lastName: "" },
      true,
    );
    expect(problems.firstName).toBeTruthy();
    expect(problems.lastName).toBeTruthy();
  });
});

describe("roleProblems", () => {
  it("needs a name and at least one permission", () => {
    const problems = roleProblems({ name: "", description: "" }, []);
    expect(problems.name).toBeTruthy();
    expect(problems.permissions).toBeTruthy();
    expect(
      roleProblems({ name: "Packer", description: "" }, ["orders.view"]),
    ).toEqual({});
  });
});

describe("groupPermissions", () => {
  it("groups by the part before the dot and keeps the order", () => {
    const groups = groupPermissions([
      { name: "orders.view" },
      { name: "orders.manage" },
      { name: "stock.view" },
    ]);
    expect(groups.map((g) => g.group)).toEqual(["orders", "stock"]);
    expect(groups[0].items).toHaveLength(2);
  });
});
