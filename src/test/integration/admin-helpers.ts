import { randomBytes } from "node:crypto";

import { POST as loginRoute } from "@/app/api/v1/admin/auth/login/route";
import { POST as verifyRoute } from "@/app/api/v1/admin/auth/2fa/verify/route";
import type { Permission } from "@/server/admin/permissions";
import { getStaffEnv } from "@/server/config/staff-env";
import { hashPassword } from "@/server/security/password";
import { encryptSecret } from "@/server/security/secret-box";
import { generateTotpSecret, totpCodeAt } from "@/server/security/totp";

import { call, exec, newIp, sql } from "./helpers";

export const STAFF_PASSWORD = "Correct-horse-battery-9";

export function uniqueStaffEmail(): string {
  return `staff.${randomBytes(4).toString("hex")}@luzanika.test`;
}

export interface TestStaff {
  id: string;
  email: string;
  password: string;
  totpSecret: string;
}

/**
 * Makes an active staff member with an authenticator already set up, straight
 * in the database (fast, and independent of the sign-in code under test).
 * Give `permissions` to also make a role with exactly those permissions and
 * give it to them. `superAdmin` makes them a super admin.
 */
export async function createStaff(
  options: {
    permissions?: Permission[];
    superAdmin?: boolean;
    email?: string;
    status?: "active" | "disabled";
    withTwoFactor?: boolean;
  } = {},
): Promise<TestStaff> {
  const email = options.email ?? uniqueStaffEmail();
  const totpSecret = generateTotpSecret();
  const withTwoFactor = options.withTwoFactor ?? true;

  const [row] = await sql<{ id: string }>(
    `INSERT INTO staff (email, first_name, last_name, password_hash, status, is_super_admin,
        totp_secret_enc, totp_enabled_at)
     VALUES (:email, 'Test', 'Staff', :hash, :status, :superAdmin,
        :secret, CASE WHEN :withTwoFactor THEN now() ELSE NULL END)
     RETURNING id`,
    {
      email,
      hash: await hashPassword(STAFF_PASSWORD),
      status: options.status ?? "active",
      superAdmin: options.superAdmin ?? false,
      secret: withTwoFactor
        ? encryptSecret(totpSecret, getStaffEnv().twoFactorKey)
        : null,
      withTwoFactor,
    },
  );

  if (options.permissions) {
    const [role] = await sql<{ id: string }>(
      `INSERT INTO roles (name, permissions)
       VALUES (:name, ARRAY(SELECT jsonb_array_elements_text(CAST(:permissions AS jsonb))))
       RETURNING id`,
      {
        name: `test-role-${randomBytes(4).toString("hex")}`,
        permissions: JSON.stringify(options.permissions),
      },
    );
    await exec(
      "INSERT INTO staff_roles (staff_id, role_id) VALUES (:staffId, :roleId)",
      {
        staffId: row.id,
        roleId: role.id,
      },
    );
  }

  return { id: row.id, email, password: STAFF_PASSWORD, totpSecret };
}

/**
 * Signs a staff member in the real way (password, then the authenticator code)
 * and returns the session cookie. `stepOffset` uses a code from a later
 * 30-second window, so signing the same person in twice in one test works.
 */
export async function signInStaff(
  staff: TestStaff,
  stepOffset = 0,
): Promise<string> {
  const ip = newIp();
  const first = await call(loginRoute, {
    ip,
    body: { email: staff.email, password: staff.password },
  });
  if (first.status !== 200 || first.staffCookie === undefined) {
    throw new Error(`Staff login failed: ${first.status} ${first.raw}`);
  }

  const code = totpCodeAt(staff.totpSecret, Date.now() + stepOffset * 30_000);
  const second = await call(verifyRoute, {
    ip,
    staffCookie: first.staffCookie,
    body: { code },
  });
  if (second.status !== 200) {
    throw new Error(`Staff 2FA failed: ${second.status} ${second.raw}`);
  }
  return second.staffCookie ?? first.staffCookie;
}

/** A staff member with the given permissions, already signed in. */
export async function signedInStaff(
  options: Parameters<typeof createStaff>[0] = {},
): Promise<TestStaff & { cookie: string }> {
  const staff = await createStaff(options);
  return { ...staff, cookie: await signInStaff(staff) };
}
