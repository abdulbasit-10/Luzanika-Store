import { execFileSync } from "node:child_process";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as acceptInviteRoute } from "@/app/api/v1/admin/auth/accept-invite/route";
import { POST as enableRoute } from "@/app/api/v1/admin/auth/2fa/enable/route";
import { POST as setupRoute } from "@/app/api/v1/admin/auth/2fa/setup/route";
import { POST as loginRoute } from "@/app/api/v1/admin/auth/login/route";
import { GET as meRoute } from "@/app/api/v1/admin/auth/me/route";
import { GET as permissionsRoute } from "@/app/api/v1/admin/permissions/route";
import {
  GET as rolesRoute,
  POST as createRoleRoute,
} from "@/app/api/v1/admin/roles/route";
import {
  DELETE as deleteRoleRoute,
  PATCH as patchRoleRoute,
} from "@/app/api/v1/admin/roles/[id]/route";
import {
  GET as staffListRoute,
  POST as inviteRoute,
} from "@/app/api/v1/admin/staff/route";
import {
  GET as staffGetRoute,
  PATCH as staffPatchRoute,
} from "@/app/api/v1/admin/staff/[id]/route";
import { POST as resendRoute } from "@/app/api/v1/admin/staff/[id]/resend-invite/route";
import { POST as resetTwoFactorRoute } from "@/app/api/v1/admin/staff/[id]/reset-two-factor/route";
import { PERMISSION_LIST } from "@/server/admin/permissions";
import { setEmailSender, type EmailMessage } from "@/server/email/email-sender";
import { totpCodeAt } from "@/server/security/totp";

import {
  createStaff,
  signInStaff,
  signedInStaff,
  uniqueStaffEmail,
} from "./admin-helpers";
import { call, exec, sql } from "./helpers";

let sent: EmailMessage[];
let failEmail = false;

beforeEach(() => {
  sent = [];
  failEmail = false;
  setEmailSender({
    send: async (message) => {
      if (failEmail) throw new Error("mail server down");
      sent.push(message);
    },
  });
});

afterEach(() => setEmailSender(undefined));

type Cookie = { staffCookie: string };

const superAdmin = async () => {
  const staff = await signedInStaff({ superAdmin: true });
  return { ...staff, staffCookie: staff.cookie };
};

const get = (
  handler: Parameters<typeof call>[0],
  who: Cookie,
  path = "/api/v1/admin/x",
) => call(handler, { method: "GET", staffCookie: who.staffCookie, path });
const post = (
  handler: Parameters<typeof call>[0],
  who: Cookie,
  body?: unknown,
  params?: Record<string, string>,
) =>
  call(handler, { method: "POST", staffCookie: who.staffCookie, body, params });
const patch = (
  handler: Parameters<typeof call>[0],
  who: Cookie,
  params: Record<string, string>,
  body: unknown,
) =>
  call(handler, {
    method: "PATCH",
    staffCookie: who.staffCookie,
    params,
    body,
  });

const newRole = (who: Cookie, overrides: Record<string, unknown> = {}) =>
  post(createRoleRoute, who, {
    name: `Role ${Math.random().toString(36).slice(2, 8)}`,
    description: "Test role",
    permissions: ["orders.view"],
    ...overrides,
  });

describe("who may manage staff and roles", () => {
  it("is for super admins only: no role can give it away", async () => {
    const everything = await signedInStaff({
      permissions: [...PERMISSION_LIST],
    });
    const who = { staffCookie: everything.cookie };
    const id = "11111111-1111-4111-8111-111111111111";

    const results = await Promise.all([
      get(staffListRoute, who),
      post(inviteRoute, who, {
        email: uniqueStaffEmail(),
        firstName: "A",
        lastName: "B",
      }),
      call(staffGetRoute, {
        method: "GET",
        staffCookie: who.staffCookie,
        params: { id },
      }),
      patch(staffPatchRoute, who, { id }, { status: "disabled" }),
      post(resendRoute, who, undefined, { id }),
      post(resetTwoFactorRoute, who, undefined, { id }),
      get(rolesRoute, who),
      post(createRoleRoute, who, { name: "x", permissions: [] }),
      patch(patchRoleRoute, who, { id }, { name: "y" }),
      call(deleteRoleRoute, {
        method: "DELETE",
        staffCookie: who.staffCookie,
        params: { id },
      }),
      get(permissionsRoute, who),
    ]);

    for (const result of results) {
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe("forbidden");
    }
  });

  it("needs a signed-in staff member", async () => {
    const results = await Promise.all([
      call(staffListRoute, { method: "GET" }),
      call(rolesRoute, { method: "GET" }),
      call(permissionsRoute, { method: "GET" }),
    ]);
    for (const result of results) expect(result.status).toBe(401);
  });

  it("lists every permission a role can allow, with a description", async () => {
    const admin = await superAdmin();

    const result = await get(permissionsRoute, admin);

    expect(result.status).toBe(200);
    expect(
      result.body.items.map((item: { name: string }) => item.name),
    ).toEqual(PERMISSION_LIST);
    expect(result.body.items[0].description).toBeTruthy();
  });
});

describe("roles", () => {
  it("creates, lists, edits and deletes a role, and records each step", async () => {
    const admin = await superAdmin();

    const created = await newRole(admin, {
      name: "Support",
      permissions: ["orders.view", "customers.view", "orders.view"],
    });
    expect(created.status).toBe(201);
    const role = created.body.role;
    // Permissions come back distinct and in catalogue order.
    expect(role).toMatchObject({
      name: "Support",
      permissions: ["orders.view", "customers.view"],
      staffCount: 0,
    });

    expect(
      (await get(rolesRoute, admin)).body.items.map(
        (r: { id: string }) => r.id,
      ),
    ).toContain(role.id);

    const edited = await patch(
      patchRoleRoute,
      admin,
      { id: role.id },
      {
        description: "Answers customers",
        permissions: ["orders.view", "orders.manage"],
      },
    );
    expect(edited.status).toBe(200);
    expect(edited.body.role).toMatchObject({
      name: "Support",
      description: "Answers customers",
      permissions: ["orders.view", "orders.manage"],
    });

    const removed = await call(deleteRoleRoute, {
      method: "DELETE",
      staffCookie: admin.staffCookie,
      params: { id: role.id },
    });
    expect(removed.status).toBe(204);

    const actions = await sql<{ action: string }>(
      "SELECT action FROM audit_log WHERE entity_type = 'role' AND entity_id = :id ORDER BY id",
      { id: role.id },
    );
    expect(actions.map((row) => row.action)).toEqual([
      "roles.create",
      "roles.update",
      "roles.delete",
    ]);
  });

  it("refuses an unknown permission, an empty name and a name that is taken", async () => {
    const admin = await superAdmin();

    const typo = await newRole(admin, { permissions: ["orders.veiw"] });
    expect(typo.status).toBe(400);
    expect(typo.body.error.fields.permissions).toContain("orders.veiw");

    expect((await newRole(admin, { name: "  " })).status).toBe(400);
    expect((await newRole(admin, { extra: true })).status).toBe(400);

    await newRole(admin, { name: "Unique name" });
    const duplicate = await newRole(admin, { name: "unique NAME" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.fields.name).toBeTruthy();
  });

  it("cannot delete a role while someone still has it", async () => {
    const admin = await superAdmin();
    const role = (await newRole(admin)).body.role;
    const worker = await createStaff();
    await exec(
      "INSERT INTO staff_roles (staff_id, role_id) VALUES (:staffId, :roleId)",
      {
        staffId: worker.id,
        roleId: role.id,
      },
    );

    const refused = await call(deleteRoleRoute, {
      method: "DELETE",
      staffCookie: admin.staffCookie,
      params: { id: role.id },
    });

    expect(refused.status).toBe(409);
    expect(
      (await get(rolesRoute, admin)).body.items.find(
        (r: { id: string }) => r.id === role.id,
      ).staffCount,
    ).toBe(1);
  });

  it("treats a malformed or unknown id as not found", async () => {
    const admin = await superAdmin();

    expect(
      (await patch(patchRoleRoute, admin, { id: "nope" }, { name: "x" }))
        .status,
    ).toBe(404);
    expect(
      (
        await patch(
          patchRoleRoute,
          admin,
          { id: "11111111-1111-4111-8111-111111111111" },
          { name: "x" },
        )
      ).status,
    ).toBe(404);
  });

  it("changes what people can do at their very next request", async () => {
    const admin = await superAdmin();
    const role = (await newRole(admin, { permissions: ["orders.view"] })).body
      .role;
    const worker = await createStaff();
    await exec(
      "INSERT INTO staff_roles (staff_id, role_id) VALUES (:staffId, :roleId)",
      {
        staffId: worker.id,
        roleId: role.id,
      },
    );
    const cookie = await signInStaff(worker);

    const before = await call(meRoute, { method: "GET", staffCookie: cookie });
    expect(before.body.permissions).toEqual(["orders.view"]);

    await patch(
      patchRoleRoute,
      admin,
      { id: role.id },
      { permissions: ["stock.view"] },
    );

    const after = await call(meRoute, { method: "GET", staffCookie: cookie });
    expect(after.body.permissions).toEqual(["stock.view"]);
  });

  it("adds up the permissions of several roles", async () => {
    const admin = await superAdmin();
    const a = (await newRole(admin, { permissions: ["orders.view"] })).body
      .role;
    const b = (
      await newRole(admin, { permissions: ["stock.view", "orders.view"] })
    ).body.role;
    const worker = await createStaff();
    await patch(
      staffPatchRoute,
      admin,
      { id: worker.id },
      { roleIds: [a.id, b.id] },
    );
    const cookie = await signInStaff(worker);

    const result = await call(meRoute, { method: "GET", staffCookie: cookie });

    expect(result.body.permissions).toEqual(["orders.view", "stock.view"]);
  });
});

describe("inviting staff", () => {
  it("invites by email, then the person chooses a password, sets up 2FA and works", async () => {
    const admin = await superAdmin();
    const role = (await newRole(admin, { permissions: ["orders.view"] })).body
      .role;
    const email = uniqueStaffEmail();

    const invited = await post(inviteRoute, admin, {
      email: email.toUpperCase(),
      firstName: "Grace",
      lastName: "Hopper",
      roleIds: [role.id],
    });

    expect(invited.status).toBe(201);
    expect(invited.body.inviteEmailSent).toBe(true);
    expect(invited.body.staff).toMatchObject({
      email,
      status: "invited",
      isSuperAdmin: false,
      twoFactorEnabled: false,
      roles: [{ id: role.id, name: role.name }],
    });
    expect(invited.body.staff.passwordHash).toBeUndefined();
    expect(invited.headers.get("location")).toBe(
      `/api/v1/admin/staff/${invited.body.staff.id}`,
    );

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(email);
    const token = /token=([A-Za-z0-9_-]{43})/.exec(sent[0].text)![1];
    expect(sent[0].text).toContain("/admin/accept-invite");

    // Cannot sign in before accepting.
    expect(
      (
        await call(loginRoute, {
          body: { email, password: "Whatever-long-pw-1" },
        })
      ).status,
    ).toBe(401);

    // A weak password is refused and the link stays usable.
    const weak = await call(acceptInviteRoute, {
      body: { token, password: "short" },
    });
    expect(weak.status).toBe(400);
    const password = "My-own-long-password-5";
    expect(
      (await call(acceptInviteRoute, { body: { token, password } })).status,
    ).toBe(204);
    expect(
      (await call(acceptInviteRoute, { body: { token, password } })).status,
    ).toBe(410);

    // Sign in: set up the authenticator, then use the admin with the role's permissions.
    const first = await call(loginRoute, { body: { email, password } });
    expect(first.body).toEqual({ next: "two_factor_setup" });
    const cookie = first.staffCookie as string;
    const setup = await call(setupRoute, { staffCookie: cookie });
    const enabled = await call(enableRoute, {
      staffCookie: cookie,
      body: { code: totpCodeAt(setup.body.secret, Date.now()) },
    });
    expect(enabled.status).toBe(200);

    const profile = await call(meRoute, { method: "GET", staffCookie: cookie });
    expect(profile.body).toMatchObject({
      stage: "verified",
      permissions: ["orders.view"],
      staff: { email, isSuperAdmin: false },
    });
    expect(
      (await call(rolesRoute, { method: "GET", staffCookie: cookie })).status,
    ).toBe(403);
  });

  it("refuses an email that already works here, and a role that does not exist", async () => {
    const admin = await superAdmin();
    const existing = await createStaff();

    const duplicate = await post(inviteRoute, admin, {
      email: existing.email,
      firstName: "A",
      lastName: "B",
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.fields.email).toBeTruthy();

    const badRole = await post(inviteRoute, admin, {
      email: uniqueStaffEmail(),
      firstName: "A",
      lastName: "B",
      roleIds: ["11111111-1111-4111-8111-111111111111"],
    });
    expect(badRole.status).toBe(400);
    expect(badRole.body.error.fields.roleIds).toBeTruthy();
    expect(sent).toHaveLength(0);
  });

  it("keeps the invite when the email cannot be sent, and sends it again on request", async () => {
    const admin = await superAdmin();
    failEmail = true;

    const invited = await post(inviteRoute, admin, {
      email: uniqueStaffEmail(),
      firstName: "Linus",
      lastName: "T",
    });
    expect(invited.status).toBe(201);
    expect(invited.body.inviteEmailSent).toBe(false);

    failEmail = false;
    const resent = await post(resendRoute, admin, undefined, {
      id: invited.body.staff.id,
    });
    expect(resent.status).toBe(200);
    expect(resent.body.inviteEmailSent).toBe(true);
    expect(sent).toHaveLength(1);
  });

  it("only the newest invite link works", async () => {
    const admin = await superAdmin();
    const invited = await post(inviteRoute, admin, {
      email: uniqueStaffEmail(),
      firstName: "A",
      lastName: "B",
    });
    await post(resendRoute, admin, undefined, { id: invited.body.staff.id });
    const [older, newer] = sent.map(
      (mail) => /token=([A-Za-z0-9_-]{43})/.exec(mail.text)![1],
    );
    const password = "My-own-long-password-5";

    expect(
      (await call(acceptInviteRoute, { body: { token: older, password } }))
        .status,
    ).toBe(410);
    expect(
      (await call(acceptInviteRoute, { body: { token: newer, password } }))
        .status,
    ).toBe(204);
  });

  it("an invite link has a time limit", async () => {
    const admin = await superAdmin();
    await post(inviteRoute, admin, {
      email: uniqueStaffEmail(),
      firstName: "A",
      lastName: "B",
    });
    const token = /token=([A-Za-z0-9_-]{43})/.exec(sent[0].text)![1];
    await exec(
      "UPDATE staff_tokens SET created_at = now() - interval '4 days', expires_at = now() - interval '1 day'",
    );

    const result = await call(acceptInviteRoute, {
      body: { token, password: "My-own-long-password-5" },
    });
    expect(result.status).toBe(410);
  });

  it("can invite another super admin, and refuses resending to someone who already accepted", async () => {
    const admin = await superAdmin();
    const invited = await post(inviteRoute, admin, {
      email: uniqueStaffEmail(),
      firstName: "A",
      lastName: "B",
      isSuperAdmin: true,
    });
    expect(invited.body.staff.isSuperAdmin).toBe(true);

    const accepted = await createStaff();
    const refused = await post(resendRoute, admin, undefined, {
      id: accepted.id,
    });
    expect(refused.status).toBe(409);
  });

  it("never reveals password hashes or authenticator secrets, and records the invite", async () => {
    const admin = await superAdmin();
    await createStaff();

    const list = await get(staffListRoute, admin);
    expect(list.status).toBe(200);
    expect(list.raw).not.toMatch(
      /passwordHash|password_hash|totpSecret|totp_secret|\$2[aby]\$/,
    );

    await post(inviteRoute, admin, {
      email: uniqueStaffEmail(),
      firstName: "A",
      lastName: "B",
    });
    const [row] = await sql<{
      after: Record<string, unknown>;
      staff_email: string;
    }>(
      "SELECT after, staff_email FROM audit_log WHERE action = 'staff.invite' ORDER BY id DESC LIMIT 1",
    );
    expect(row.staff_email).toBe(admin.email);
    expect(JSON.stringify(row.after)).not.toMatch(/token|hash/i);
  });
});

describe("changing staff", () => {
  it("disabling signs the person out at once; enabling lets them back in", async () => {
    const admin = await superAdmin();
    const worker = await signedInStaff();
    expect(
      (await call(meRoute, { method: "GET", staffCookie: worker.cookie }))
        .status,
    ).toBe(200);

    const disabled = await patch(
      staffPatchRoute,
      admin,
      { id: worker.id },
      { status: "disabled" },
    );
    expect(disabled.body.staff.status).toBe("disabled");
    expect(
      (await call(meRoute, { method: "GET", staffCookie: worker.cookie }))
        .status,
    ).toBe(401);
    expect(
      (
        await call(loginRoute, {
          body: { email: worker.email, password: worker.password },
        })
      ).status,
    ).toBe(401);

    const enabled = await patch(
      staffPatchRoute,
      admin,
      { id: worker.id },
      { status: "active" },
    );
    expect(enabled.body.staff.status).toBe("active");
    expect(
      (
        await call(loginRoute, {
          body: { email: worker.email, password: worker.password },
        })
      ).status,
    ).toBe(200);
  });

  it("sends someone who never accepted their invite back to waiting when re-enabled", async () => {
    const admin = await superAdmin();
    const invited = await post(inviteRoute, admin, {
      email: uniqueStaffEmail(),
      firstName: "A",
      lastName: "B",
    });
    const id = invited.body.staff.id;

    await patch(staffPatchRoute, admin, { id }, { status: "disabled" });
    const back = await patch(
      staffPatchRoute,
      admin,
      { id },
      { status: "active" },
    );

    expect(back.body.staff.status).toBe("invited");
  });

  it("changes names and roles, and records before and after", async () => {
    const admin = await superAdmin();
    const role = (await newRole(admin)).body.role;
    const worker = await createStaff();

    const result = await patch(
      staffPatchRoute,
      admin,
      { id: worker.id },
      {
        firstName: "Edsger",
        roleIds: [role.id],
      },
    );

    expect(result.status).toBe(200);
    expect(result.body.staff).toMatchObject({
      firstName: "Edsger",
      roles: [{ id: role.id }],
    });
    const [row] = await sql<{
      before: { firstName: string; roleIds: string[] };
      after: { firstName: string; roleIds: string[] };
    }>(
      "SELECT before, after FROM audit_log WHERE action = 'staff.update' AND entity_id = :id",
      { id: worker.id },
    );
    expect(row.before).toMatchObject({ firstName: "Test", roleIds: [] });
    expect(row.after).toMatchObject({
      firstName: "Edsger",
      roleIds: [role.id],
    });
  });

  it("refuses unknown fields, so nobody can set internals such as the password hash", async () => {
    const admin = await superAdmin();
    const worker = await createStaff();

    const result = await patch(
      staffPatchRoute,
      admin,
      { id: worker.id },
      { passwordHash: "x" },
    );

    expect(result.status).toBe(400);
  });

  it("will not let a super admin disable or demote themselves", async () => {
    const admin = await superAdmin();

    const disable = await patch(
      staffPatchRoute,
      admin,
      { id: admin.id },
      { status: "disabled" },
    );
    const demote = await patch(
      staffPatchRoute,
      admin,
      { id: admin.id },
      { isSuperAdmin: false },
    );

    expect(disable.status).toBe(409);
    expect(demote.status).toBe(409);
    expect(
      (await call(meRoute, { method: "GET", staffCookie: admin.staffCookie }))
        .status,
    ).toBe(200);
  });

  it("always leaves one active super admin, even when two demote each other at the same moment", async () => {
    const a = await superAdmin();
    const b = await superAdmin();
    // Super admins left over from other tests would count as "another one", so make these two the only ones.
    await exec(
      "UPDATE staff SET is_super_admin = false WHERE is_super_admin AND id NOT IN (:ids)",
      { ids: [a.id, b.id] },
    );

    const [first, second] = await Promise.all([
      patch(staffPatchRoute, a, { id: b.id }, { isSuperAdmin: false }),
      patch(staffPatchRoute, b, { id: a.id }, { isSuperAdmin: false }),
    ]);

    const statuses = [first.status, second.status].sort();
    // One of them goes through; the other is stopped (it is either refused, or no longer a super admin).
    expect(statuses[0]).toBe(200);
    expect(statuses[1]).toBeGreaterThanOrEqual(403);
    const remaining = await sql<{ n: string }>(
      "SELECT count(*) AS n FROM staff WHERE is_super_admin AND status = 'active' AND id IN (:ids)",
      { ids: [a.id, b.id] },
    );
    expect(Number(remaining[0].n)).toBe(1);
  });

  it("resets the authenticator of someone who lost their phone", async () => {
    const admin = await superAdmin();
    const worker = await signedInStaff();

    const result = await post(resetTwoFactorRoute, admin, undefined, {
      id: worker.id,
    });

    expect(result.status).toBe(200);
    expect(result.body.staff.twoFactorEnabled).toBe(false);
    expect(
      (await call(meRoute, { method: "GET", staffCookie: worker.cookie }))
        .status,
    ).toBe(401);
    const next = await call(loginRoute, {
      body: { email: worker.email, password: worker.password },
    });
    expect(next.body).toEqual({ next: "two_factor_setup" });
    const [{ n }] = await sql<{ n: string }>(
      "SELECT count(*) AS n FROM staff_recovery_codes WHERE staff_id = :id",
      { id: worker.id },
    );
    expect(Number(n)).toBe(0);
  });

  it("gets one staff member, and not found for a stranger", async () => {
    const admin = await superAdmin();
    const worker = await createStaff();

    const found = await call(staffGetRoute, {
      method: "GET",
      staffCookie: admin.staffCookie,
      params: { id: worker.id },
    });
    expect(found.body.staff.email).toBe(worker.email);

    const missing = await call(staffGetRoute, {
      method: "GET",
      staffCookie: admin.staffCookie,
      params: { id: "11111111-1111-4111-8111-111111111111" },
    });
    expect(missing.status).toBe(404);
  });

  it("searches and filters the staff list", async () => {
    const admin = await superAdmin();
    const worker = await createStaff({ status: "disabled" });

    const byEmail = await call(staffListRoute, {
      method: "GET",
      staffCookie: admin.staffCookie,
      path: `/api/v1/admin/staff?search=${encodeURIComponent(worker.email)}`,
    });
    expect(byEmail.body.items.map((item: { id: string }) => item.id)).toEqual([
      worker.id,
    ]);

    const disabled = await call(staffListRoute, {
      method: "GET",
      staffCookie: admin.staffCookie,
      path: "/api/v1/admin/staff?status=disabled",
    });
    expect(
      disabled.body.items.every(
        (item: { status: string }) => item.status === "disabled",
      ),
    ).toBe(true);
  });
});

describe("creating the first super admin with the script", () => {
  const run = (...args: string[]) => {
    try {
      const output = execFileSync(
        process.execPath,
        ["node_modules/tsx/dist/cli.mjs", "db/create-super-admin.ts", ...args],
        {
          // The script prefers DATABASE_MIGRATION_URL: point both at the throw-away database, never at a real one.
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL,
            DATABASE_MIGRATION_URL: process.env.DATABASE_URL,
          },
          encoding: "utf8",
          stdio: "pipe",
        },
      );
      return { code: 0, output };
    } catch (error) {
      const failure = error as {
        status: number;
        stderr: string;
        stdout: string;
      };
      return {
        code: failure.status,
        output: `${failure.stdout}${failure.stderr}`,
      };
    }
  };

  it("makes an invited super admin and prints a link that works once", async () => {
    // The throw-away database already has super admins from the other tests in this file.
    const email = uniqueStaffEmail();
    const result = run(
      "--email",
      email,
      "--first",
      "Ada",
      "--last",
      "Lovelace",
      "--force",
    );

    expect(result.code).toBe(0);
    const token = /token=([A-Za-z0-9_-]{43})/.exec(result.output)![1];

    const [row] = await sql<{
      status: string;
      is_super_admin: boolean;
      password_hash: string | null;
    }>(
      "SELECT status, is_super_admin, password_hash FROM staff WHERE email = :email",
      { email },
    );
    expect(row).toEqual({
      status: "invited",
      is_super_admin: true,
      password_hash: null,
    });

    const password = "My-own-long-password-5";
    expect(
      (await call(acceptInviteRoute, { body: { token, password } })).status,
    ).toBe(204);
    expect(
      (await call(acceptInviteRoute, { body: { token, password } })).status,
    ).toBe(410);
    expect(
      (await call(loginRoute, { body: { email, password } })).body,
    ).toEqual({
      next: "two_factor_setup",
    });
  });

  it("refuses when a super admin already exists, unless told otherwise, and never touches an existing account", async () => {
    await createStaff({ superAdmin: true });

    const refused = run(
      "--email",
      uniqueStaffEmail(),
      "--first",
      "A",
      "--last",
      "B",
    );
    expect(refused.code).toBe(1);
    expect(refused.output).toContain("already exists");

    const existing = await createStaff();
    const clash = run(
      "--email",
      existing.email,
      "--first",
      "A",
      "--last",
      "B",
      "--force",
    );
    expect(clash.code).toBe(1);
    expect(clash.output).toContain("Nothing was changed");
  });

  it("explains what is missing", () => {
    const result = run("--email", "someone@example.com");

    expect(result.code).toBe(1);
    expect(result.output).toContain("Usage");
  });
});
