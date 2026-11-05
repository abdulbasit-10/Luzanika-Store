export interface PersonText {
  email: string;
  firstName: string;
  lastName: string;
}

export type PersonProblems = Partial<Record<keyof PersonText, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** `needEmail` is false when changing a person: their email cannot be changed. */
export function personProblems(
  values: PersonText,
  needEmail: boolean,
): PersonProblems {
  const problems: PersonProblems = {};
  if (needEmail) {
    const email = values.email.trim();
    if (!email) problems.email = "Enter an email address";
    else if (!EMAIL.test(email) || email.length > 254)
      problems.email = "Enter a valid email address";
  }
  if (!values.firstName.trim()) problems.firstName = "Enter the first name";
  else if (values.firstName.trim().length > 60)
    problems.firstName = "Keep it under 60 characters";
  if (!values.lastName.trim()) problems.lastName = "Enter the last name";
  else if (values.lastName.trim().length > 60)
    problems.lastName = "Keep it under 60 characters";
  return problems;
}

export interface RoleText {
  name: string;
  description: string;
}

export function roleProblems(
  values: RoleText,
  permissions: readonly string[],
): Partial<Record<keyof RoleText | "permissions", string>> {
  const problems: Partial<Record<keyof RoleText | "permissions", string>> = {};
  if (!values.name.trim()) problems.name = "Enter a name for the role";
  else if (values.name.trim().length > 60)
    problems.name = "Keep it under 60 characters";
  if (values.description.trim().length > 300)
    problems.description = "Keep it under 300 characters";
  if (permissions.length === 0)
    problems.permissions = "Tick at least one permission";
  return problems;
}

/** Permission names grouped by the part before the dot ("orders.view" → "orders"), in the order given. */
export function groupPermissions<T extends { name: string }>(
  permissions: readonly T[],
): { group: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const permission of permissions) {
    const group = permission.name.split(".")[0];
    groups.set(group, [...(groups.get(group) ?? []), permission]);
  }
  return [...groups].map(([group, items]) => ({ group, items }));
}
