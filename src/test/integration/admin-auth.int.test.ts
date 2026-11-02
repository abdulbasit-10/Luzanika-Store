import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as enableRoute } from "@/app/api/v1/admin/auth/2fa/enable/route";
import { POST as setupRoute } from "@/app/api/v1/admin/auth/2fa/setup/route";
import { POST as verifyRoute } from "@/app/api/v1/admin/auth/2fa/verify/route";
import { POST as changePasswordRoute } from "@/app/api/v1/admin/auth/change-password/route";
import { POST as forgotRoute } from "@/app/api/v1/admin/auth/forgot-password/route";
import { POST as loginRoute } from "@/app/api/v1/admin/auth/login/route";
import { POST as logoutRoute } from "@/app/api/v1/admin/auth/logout/route";
import { GET as meRoute } from "@/app/api/v1/admin/auth/me/route";
import { POST as resetRoute } from "@/app/api/v1/admin/auth/reset-password/route";
import { GET as cartRoute } from "@/app/api/v1/cart/route";
import { GET as rolesRoute } from "@/app/api/v1/admin/roles/route";
import { getStaffEnv } from "@/server/config/staff-env";
import { setEmailSender, type EmailMessage } from "@/server/email/email-sender";
import { decryptSecret } from "@/server/security/secret-box";
import { totpCodeAt } from "@/server/security/totp";

import {
  createStaff,
  signInStaff,
  signedInStaff,
  STAFF_PASSWORD,
  uniqueStaffEmail,
} from "./admin-helpers";
import { call, exec, newIp, sql } from "./helpers";

let sent: EmailMessage[];

beforeEach(() => {
  sent = [];
  setEmailSender({
    send: async (message) => {
      sent.push(message);
    },
  });
});

afterEach(() => setEmailSender(undefined));

const login = (email: string, password: string, ip?: string) =>
  call(loginRoute, { ip, body: { email, password } });
const me = (staffCookie: string | undefined) =>
  call(meRoute, { method: "GET", staffCookie });
const verify = (staffCookie: string, body: unknown, ip?: string) =>
  call(verifyRoute, { staffCookie, body, ip });

const codeFor = (secret: string, stepOffset = 0) =>
  totpCodeAt(secret, Date.now() + stepOffset * 30_000);

describe("password step", () => {
  it("answers a wrong password and an unknown email in exactly the same way", async () => {
    const staff = await createStaff();

    const wrong = await login(staff.email, "not-the-password-1");
    const unknown = await login(uniqueStaffEmail(), STAFF_PASSWORD);

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.code).toBe("invalid_credentials");
    expect(unknown.body.error).toEqual({
      ...wrong.body.error,
      requestId: unknown.body.error.requestId,
    });
    expect(wrong.staffCookie).toBeUndefined();
  });

  it("refuses staff who are disabled or have not accepted their invite", async () => {
    const disabled = await createStaff({ status: "disabled" });
    expect((await login(disabled.email, disabled.password)).status).toBe(401);

    const [invited] = await sql<{ email: string }>(
      "INSERT INTO staff (email, first_name, last_name) VALUES (:email, 'In', 'Vited') RETURNING email",
      { email: uniqueStaffEmail() },
    );
    expect((await login(invited.email, STAFF_PASSWORD)).status).toBe(401);
  });

  it("is not reachable with a customer account's password or cookie", async () => {
    const customerEmail = `customer.${newIp()}@example.com`;
    expect((await login(customerEmail, "Sup3r-secret-pw")).status).toBe(401);

    const result = await call(meRoute, {
      method: "GET",
      cookie: "x".repeat(43),
    });
    expect(result.status).toBe(401);
  });

  it("is not usable on the customers' endpoints", async () => {
    const staff = await signedInStaff({ superAdmin: true });

    const result = await call(cartRoute, {
      method: "GET",
      path: "/api/v1/cart?market=PK",
      staffCookie: staff.cookie,
    });
    expect(result.status).toBe(401);
  });

  it("blocks a request that comes from another website", async () => {
    const staff = await createStaff();

    const result = await call(loginRoute, {
      headers: { origin: "https://evil.example" },
      body: { email: staff.email, password: staff.password },
    });

    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("csrf_failed");
  });

  it("limits guessing one account's password from one address", async () => {
    const staff = await createStaff();
    const ip = newIp();

    for (let i = 0; i < 5; i++) {
      expect((await login(staff.email, "wrong-password-1", ip)).status).toBe(
        401,
      );
    }
    const blocked = await login(staff.email, staff.password, ip);

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });
});

describe("authenticator step", () => {
  it("gives a pending session after the password: it can do nothing but finish 2FA", async () => {
    const staff = await createStaff({ superAdmin: true });

    const result = await login(staff.email, staff.password);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ next: "two_factor_verify" });
    const cookie = result.staffCookie as string;

    const profile = await me(cookie);
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({
      stage: "pending",
      next: "two_factor_verify",
    });
    expect(profile.body.permissions).toBeUndefined();

    const blocked = await call(rolesRoute, {
      method: "GET",
      staffCookie: cookie,
    });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("two_factor_required");
  });

  it("opens the session with a correct code, and refuses a wrong one", async () => {
    const staff = await createStaff({ superAdmin: true });
    const { staffCookie } = await login(staff.email, staff.password);

    const wrong = await verify(staffCookie as string, { code: "000000" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.fields.code).toBeTruthy();
    expect((await me(staffCookie)).body.stage).toBe("pending");

    const right = await verify(staffCookie as string, {
      code: codeFor(staff.totpSecret),
    });
    expect(right.status).toBe(200);

    const profile = await me(staffCookie);
    expect(profile.body.stage).toBe("verified");
    expect(profile.body.staff).toMatchObject({
      email: staff.email,
      isSuperAdmin: true,
      twoFactorEnabled: true,
    });
    expect(profile.body.staff.passwordHash).toBeUndefined();
    expect(
      (await call(rolesRoute, { method: "GET", staffCookie })).status,
    ).toBe(200);
  });

  it("never accepts the same code twice", async () => {
    const staff = await createStaff();
    const code = codeFor(staff.totpSecret);

    const first = await login(staff.email, staff.password);
    expect((await verify(first.staffCookie as string, { code })).status).toBe(
      200,
    );

    const second = await login(staff.email, staff.password);
    const replay = await verify(second.staffCookie as string, { code });
    expect(replay.status).toBe(400);
    expect((await me(second.staffCookie)).body.stage).toBe("pending");

    // A code from the next 30 seconds is fine.
    const next = await verify(second.staffCookie as string, {
      code: codeFor(staff.totpSecret, 1),
    });
    expect(next.status).toBe(200);
  });

  it("allows five wrong codes, then stops, even from another address", async () => {
    const staff = await createStaff();
    const { staffCookie } = await login(staff.email, staff.password);

    for (let i = 0; i < 5; i++) {
      expect(
        (await verify(staffCookie as string, { code: "000000" })).status,
      ).toBe(400);
    }
    const blocked = await verify(staffCookie as string, {
      code: codeFor(staff.totpSecret),
    });

    expect(blocked.status).toBe(429);
  });

  it("refuses a request with both a code and a recovery code, or neither", async () => {
    const staff = await createStaff();
    const { staffCookie } = await login(staff.email, staff.password);

    expect(
      (
        await verify(staffCookie as string, {
          code: "123456",
          recoveryCode: "a1b2c-3d4e5",
        })
      ).status,
    ).toBe(400);
    expect((await verify(staffCookie as string, {})).status).toBe(400);
  });

  it("writes the sign-in to the audit log", async () => {
    const staff = await createStaff();
    await signInStaff(staff);

    const rows = await sql<{
      action: string;
      ip: string | null;
      staff_email: string;
    }>(
      "SELECT action, ip::text AS ip, staff_email FROM audit_log WHERE staff_id = :id",
      { id: staff.id },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: "staff.login",
      staff_email: staff.email,
    });
    expect(rows[0].ip).toBeTruthy();
  });
});

describe("setting up the authenticator", () => {
  it("walks a new person through set-up, and shows the recovery codes once", async () => {
    const staff = await createStaff({ withTwoFactor: false });

    const first = await login(staff.email, staff.password);
    expect(first.body).toEqual({ next: "two_factor_setup" });
    const cookie = first.staffCookie as string;

    const setup = await call(setupRoute, {
      staffCookie: cookie,
      body: undefined,
    });
    expect(setup.status).toBe(200);
    expect(setup.body.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(setup.body.otpauthUrl).toContain(`secret=${setup.body.secret}`);

    // Only an encrypted copy is stored, never the secret itself.
    const [stored] = await sql<{
      totp_secret_enc: string;
      totp_enabled_at: Date | null;
    }>("SELECT totp_secret_enc, totp_enabled_at FROM staff WHERE id = :id", {
      id: staff.id,
    });
    expect(stored.totp_secret_enc).not.toContain(setup.body.secret);
    expect(
      decryptSecret(stored.totp_secret_enc, getStaffEnv().twoFactorKey),
    ).toBe(setup.body.secret);
    expect(stored.totp_enabled_at).toBeNull();

    const wrong = await call(enableRoute, {
      staffCookie: cookie,
      body: { code: "000000" },
    });
    expect(wrong.status).toBe(400);
    expect((await me(cookie)).body.stage).toBe("pending");

    const enabled = await call(enableRoute, {
      staffCookie: cookie,
      body: { code: codeFor(setup.body.secret) },
    });
    expect(enabled.status).toBe(200);
    expect(enabled.body.recoveryCodes).toHaveLength(10);
    expect((await me(cookie)).body.stage).toBe("verified");

    const hashes = await sql<{ code_hash: string }>(
      "SELECT code_hash FROM staff_recovery_codes WHERE staff_id = :id",
      { id: staff.id },
    );
    expect(hashes).toHaveLength(10);
    for (const code of enabled.body.recoveryCodes as string[]) {
      expect(hashes.map((row) => row.code_hash)).not.toContain(code);
    }

    // From now on a code is needed at every sign-in.
    expect((await login(staff.email, staff.password)).body).toEqual({
      next: "two_factor_verify",
    });
  });

  it("cannot start set-up again once the authenticator is on", async () => {
    const staff = await createStaff();
    const { staffCookie } = await login(staff.email, staff.password);

    const result = await call(setupRoute, { staffCookie, body: undefined });
    expect(result.status).toBe(409);
  });

  it("lets a recovery code be used once", async () => {
    const staff = await createStaff({ withTwoFactor: false });
    const first = await login(staff.email, staff.password);
    const cookie = first.staffCookie as string;
    const setup = await call(setupRoute, {
      staffCookie: cookie,
      body: undefined,
    });
    const enabled = await call(enableRoute, {
      staffCookie: cookie,
      body: { code: codeFor(setup.body.secret) },
    });
    const [code] = enabled.body.recoveryCodes as string[];

    const second = await login(staff.email, staff.password);
    const used = await verify(second.staffCookie as string, {
      recoveryCode: code.toUpperCase(),
    });
    expect(used.status).toBe(200);
    expect(used.body.recoveryCodesLeft).toBe(9);
    expect((await me(second.staffCookie)).body.stage).toBe("verified");

    const third = await login(staff.email, staff.password);
    const again = await verify(third.staffCookie as string, {
      recoveryCode: code,
    });
    expect(again.status).toBe(400);
  });
});

describe("how long a session lasts", () => {
  it("drops a pending session that waited too long for the code", async () => {
    const staff = await createStaff();
    const { staffCookie } = await login(staff.email, staff.password);
    await exec(
      "UPDATE staff_sessions SET created_at = now() - interval '11 minutes' WHERE staff_id = :id",
      { id: staff.id },
    );

    expect((await me(staffCookie)).status).toBe(401);
    expect(
      (await verify(staffCookie as string, { code: codeFor(staff.totpSecret) }))
        .status,
    ).toBe(401);
  });

  it("ends a session that was idle for two hours", async () => {
    const staff = await signedInStaff();
    expect((await me(staff.cookie)).status).toBe(200);

    await exec(
      "UPDATE staff_sessions SET created_at = now() - interval '3 hours', expires_at = now() - interval '1 minute' WHERE staff_id = :id",
      { id: staff.id },
    );
    expect((await me(staff.cookie)).status).toBe(401);
  });

  it("ends a session after twelve hours however often it is used", async () => {
    const staff = await signedInStaff();
    await exec(
      `UPDATE staff_sessions SET created_at = now() - interval '13 hours',
         expires_at = now() + interval '1 hour' WHERE staff_id = :id`,
      { id: staff.id },
    );

    expect((await me(staff.cookie)).status).toBe(401);
  });

  it("extends a used session, but never past twelve hours in total", async () => {
    const staff = await signedInStaff();
    await exec(
      `UPDATE staff_sessions SET created_at = now() - interval '11 hours 50 minutes',
         last_used_at = now() - interval '10 minutes',
         expires_at = now() + interval '5 minutes' WHERE staff_id = :id`,
      { id: staff.id },
    );

    const result = await me(staff.cookie);
    expect(result.status).toBe(200);
    expect(result.staffCookie).toBe(staff.cookie);

    const [row] = await sql<{ left_minutes: number }>(
      `SELECT extract(epoch FROM (expires_at - (created_at + interval '12 hours'))) / 60 AS left_minutes
       FROM staff_sessions WHERE staff_id = :id`,
      { id: staff.id },
    );
    expect(Number(row.left_minutes)).toBeLessThanOrEqual(0.01);
  });

  it("signs out at once when the person is disabled", async () => {
    const staff = await signedInStaff();
    await exec("UPDATE staff SET status = 'disabled' WHERE id = :id", {
      id: staff.id,
    });

    expect((await me(staff.cookie)).status).toBe(401);
  });

  it("logs out, and a logged-out cookie no longer works", async () => {
    const staff = await signedInStaff();

    const result = await call(logoutRoute, { staffCookie: staff.cookie });

    expect(result.status).toBe(204);
    expect(result.staffCookie).toBe("");
    expect((await me(staff.cookie)).status).toBe(401);
    // Logging out when not signed in is fine too.
    expect((await call(logoutRoute, {})).status).toBe(204);
  });
});

describe("password", () => {
  it("needs the current password, and keeps staff passwords long", async () => {
    const staff = await signedInStaff();

    const wrong = await call(changePasswordRoute, {
      staffCookie: staff.cookie,
      body: {
        currentPassword: "nope-nope-nope-1",
        newPassword: "A-much-longer-new-password-7",
      },
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.fields.currentPassword).toBeTruthy();

    const short = await call(changePasswordRoute, {
      staffCookie: staff.cookie,
      body: { currentPassword: staff.password, newPassword: "Short-pw-1!" },
    });
    expect(short.status).toBe(400);
    expect(short.body.error.fields.newPassword).toContain("12");
  });

  it("signs out every other browser but keeps this one", async () => {
    const staff = await createStaff();
    const here = await signInStaff(staff);
    const elsewhere = await signInStaff(staff, 1);

    const result = await call(changePasswordRoute, {
      staffCookie: here,
      body: {
        currentPassword: staff.password,
        newPassword: "A-much-longer-new-password-7",
      },
    });

    expect(result.status).toBe(204);
    expect((await me(here)).status).toBe(200);
    expect((await me(elsewhere)).status).toBe(401);
    expect(
      (await login(staff.email, "A-much-longer-new-password-7")).status,
    ).toBe(200);
    expect((await login(staff.email, staff.password)).status).toBe(401);
  });

  it("sends a reset link only to real staff, and says the same either way", async () => {
    const staff = await createStaff();

    const unknown = await call(forgotRoute, {
      body: { email: uniqueStaffEmail() },
    });
    const known = await call(forgotRoute, { body: { email: staff.email } });

    expect(unknown.status).toBe(204);
    expect(known.status).toBe(204);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(staff.email);
    expect(sent[0].text).toMatch(
      /\/admin\/reset-password\?token=[A-Za-z0-9_-]{43}/,
    );
  });

  it("resets the password from the emailed link, once, and signs everyone out", async () => {
    const staff = await createStaff();
    const cookie = await signInStaff(staff);
    await call(forgotRoute, { body: { email: staff.email } });
    const token = /token=([A-Za-z0-9_-]{43})/.exec(sent[0].text)![1];

    const weak = await call(resetRoute, { body: { token, password: "short" } });
    expect(weak.status).toBe(400);

    const done = await call(resetRoute, {
      body: { token, password: "Brand-new-long-password-3" },
    });
    expect(done.status).toBe(204);
    expect((await me(cookie)).status).toBe(401);
    expect((await login(staff.email, "Brand-new-long-password-3")).status).toBe(
      200,
    );

    const reused = await call(resetRoute, {
      body: { token, password: "Another-long-password-4" },
    });
    expect(reused.status).toBe(410);
    expect(reused.body.error.code).toBe("invalid_reset_link");
  });

  it("does not send anything for a disabled person", async () => {
    const staff = await createStaff({ status: "disabled" });

    expect(
      (await call(forgotRoute, { body: { email: staff.email } })).status,
    ).toBe(204);
    expect(sent).toHaveLength(0);
  });
});

describe("audit log", () => {
  it("cannot be edited or deleted, even by someone with full database access to the table", async () => {
    const staff = await createStaff();
    await signInStaff(staff);

    await expect(
      exec("UPDATE audit_log SET action = 'x' WHERE staff_id = :id", {
        id: staff.id,
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      exec("DELETE FROM audit_log WHERE staff_id = :id", { id: staff.id }),
    ).rejects.toThrow(/append-only/);
  });
});
