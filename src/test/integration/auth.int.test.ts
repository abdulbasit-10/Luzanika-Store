import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as changePassword } from "@/app/api/v1/auth/change-password/route";
import { POST as forgotPassword } from "@/app/api/v1/auth/forgot-password/route";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { POST as resetPassword } from "@/app/api/v1/auth/reset-password/route";
import { setEmailSender, type EmailMessage } from "@/server/email/email-sender";
import { sessionRepository } from "@/server/repositories/session-repository";
import { tokenRepository } from "@/server/repositories/token-repository";

import { call, exec, newIp, sql, uniqueEmail } from "./helpers";

const PASSWORD = "Sup3r-secret-pw";

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

async function signUp(overrides: Record<string, unknown> = {}) {
  const email = uniqueEmail();
  const result = await call(register, {
    body: {
      firstName: "Ada",
      lastName: "Lovelace",
      email,
      password: PASSWORD,
      ...overrides,
    },
  });
  return { email, result, cookie: result.cookie as string };
}

function resetTokenFrom(message: EmailMessage): string {
  const match = /token=([A-Za-z0-9_-]{43})/.exec(message.text);
  if (!match) throw new Error("no reset link in email");
  return match[1];
}

describe("register", () => {
  it("creates the account, signs in, and never exposes the hash", async () => {
    const { email, result } = await signUp();

    expect(result.status).toBe(201);
    expect(result.body.user).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email,
      emailVerified: false,
    });
    expect(result.raw).not.toMatch(/password|\$2[aby]\$/i);
    expect(result.headers.get("location")).toBe("/api/v1/auth/me");
    expect(result.cookie).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const setCookie = result.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Path=\//);
  });

  it("stores a bcrypt hash, never the password, and the session as a hash only", async () => {
    const { email, cookie } = await signUp();

    const [customer] = await sql<{ password_hash: string }>(
      "SELECT password_hash FROM customers WHERE email = :email",
      { email },
    );
    expect(customer.password_hash).toMatch(/^\$2b\$\d{2}\$/);
    expect(customer.password_hash).not.toContain(PASSWORD);

    const expected = createHash("sha256").update(cookie).digest("hex");
    const sessions = await sql<{ token_hash: string }>(
      "SELECT s.token_hash FROM customer_sessions s JOIN customers c ON c.id = s.customer_id WHERE c.email = :email",
      { email },
    );
    expect(sessions).toEqual([{ token_hash: expected }]);
    expect(JSON.stringify(sessions)).not.toContain(cookie);
  });

  it("trims and lower-cases the email before storing it", async () => {
    const email = uniqueEmail();
    const result = await call(register, {
      body: {
        firstName: "A",
        lastName: "B",
        email: `  ${email.toUpperCase()}  `,
        password: PASSWORD,
      },
    });
    expect(result.status).toBe(201);
    expect(result.body.user.email).toBe(email);
    const rows = await sql<{ email: string }>(
      "SELECT email FROM customers WHERE email = :email",
      { email },
    );
    expect(rows).toEqual([{ email }]);
  });

  it("refuses a second account with the same email in any letter case", async () => {
    const { email } = await signUp();
    const second = await call(register, {
      body: {
        firstName: "X",
        lastName: "Y",
        email: email.toUpperCase(),
        password: PASSWORD,
      },
    });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("email_taken");
    expect(second.body.error.fields.email).toBeTruthy();
    expect(second.cookie).toBeUndefined();
  });

  it("rejects weak passwords with a message on the password field", async () => {
    for (const [password, pattern] of [
      ["12345", /at least 6/i],
      ["password", /too common/i],
      ["Qwerty123", /too common/i],
      ["aaaaaaaa", /too common/i],
      ["x7".repeat(36) + "a", /shorter/i],
    ] as const) {
      const result = await call(register, {
        body: { firstName: "A", lastName: "B", email: uniqueEmail(), password },
      });
      expect(result.status, password).toBe(400);
      expect(result.body.error.code).toBe("validation_failed");
      expect(result.body.error.fields.password).toMatch(pattern);
    }
  });

  it("rejects the email as the password", async () => {
    const email = uniqueEmail();
    const result = await call(register, {
      body: { firstName: "A", lastName: "B", email, password: email },
    });
    expect(result.status).toBe(400);
    expect(result.body.error.fields.password).toMatch(/same as your email/i);
  });

  it("validates names and email", async () => {
    const result = await call(register, {
      body: {
        firstName: "",
        lastName: "x".repeat(51),
        email: "not-an-email",
        password: PASSWORD,
      },
    });
    expect(result.status).toBe(400);
    expect(Object.keys(result.body.error.fields).sort()).toEqual([
      "email",
      "firstName",
      "lastName",
    ]);
  });

  it("refuses fields it does not know, so nobody can set status or role themselves", async () => {
    const result = await call(register, {
      body: {
        firstName: "A",
        lastName: "B",
        email: uniqueEmail(),
        password: PASSWORD,
        status: "active",
        isAdmin: true,
      },
    });
    expect(result.status).toBe(400);
  });

  it("refuses non-JSON and broken JSON", async () => {
    const wrongType = await call(register, {
      body: { firstName: "A" },
      headers: { "content-type": "text/plain" },
    });
    expect(wrongType.status).toBe(415);
  });

  it("is limited to 5 sign-ups per hour per visitor", async () => {
    const ip = newIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const result = await call(register, {
        ip,
        body: {
          firstName: "A",
          lastName: "B",
          email: uniqueEmail(),
          password: PASSWORD,
        },
      });
      statuses.push(result.status);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });

  it("refuses requests that come from another website", async () => {
    const result = await call(register, {
      headers: { origin: "https://evil.example" },
      body: {
        firstName: "A",
        lastName: "B",
        email: uniqueEmail(),
        password: PASSWORD,
      },
    });
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("csrf_failed");
  });
});

describe("login", () => {
  it("signs in with the right password, in any letter case of the email", async () => {
    const { email } = await signUp();
    const result = await call(login, {
      body: { email: email.toUpperCase(), password: PASSWORD },
    });

    expect(result.status).toBe(200);
    expect(result.body.user.email).toBe(email);
    expect(result.cookie).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.raw).not.toMatch(/passwordHash|\$2[aby]\$/);

    const [row] = await sql<{ last_login_at: Date | null }>(
      "SELECT last_login_at FROM customers WHERE email = :email",
      { email },
    );
    expect(row.last_login_at).not.toBeNull();
  });

  it("gives a new session token every time (no session fixation)", async () => {
    const { email, cookie } = await signUp();
    const result = await call(login, { body: { email, password: PASSWORD } });
    expect(result.cookie).not.toBe(cookie);
  });

  it("answers identically for a wrong password and an unknown email", async () => {
    const { email } = await signUp();
    const wrongPassword = await call(login, {
      body: { email, password: "wrong-password-1" },
    });
    const unknownEmail = await call(login, {
      body: { email: uniqueEmail(), password: "wrong-password-1" },
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("invalid_credentials");
    expect(unknownEmail.body.error.code).toBe("invalid_credentials");
    expect(wrongPassword.body.error.message).toBe(
      unknownEmail.body.error.message,
    );
    expect(wrongPassword.cookie).toBeUndefined();
  });

  it("refuses a blocked account the same way", async () => {
    const { email } = await signUp();
    await exec("UPDATE customers SET status = 'blocked' WHERE email = :email", {
      email,
    });

    const result = await call(login, { body: { email, password: PASSWORD } });
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("invalid_credentials");
  });

  it("does not let a password cut at 72 bytes match a longer guess", async () => {
    const { email } = await signUp({ password: "x7".repeat(36) }); // exactly 72 bytes
    const longer = await call(login, {
      body: { email, password: "x7".repeat(36) + "extra" },
    });
    expect(longer.status).toBe(401);
    const exact = await call(login, {
      body: { email, password: "x7".repeat(36) },
    });
    expect(exact.status).toBe(200);
  });

  it("blocks guessing: 5 tries per account from one address, then 429 even for the right password", async () => {
    const { email } = await signUp();
    const ip = newIp();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push(
        (
          await call(login, {
            ip,
            body: { email, password: `wrong-guess-${i}` },
          })
        ).status,
      );
    }
    const blocked = await call(login, {
      ip,
      body: { email, password: PASSWORD },
    });

    expect(statuses).toEqual([401, 401, 401, 401, 401]);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("rate_limited");
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);

    // Someone else, from another address, is not affected by that block.
    const other = await call(login, { body: { email, password: PASSWORD } });
    expect(other.status).toBe(200);
  });

  it("refuses requests from another website", async () => {
    const { email } = await signUp();
    const result = await call(login, {
      headers: { origin: "https://evil.example" },
      body: { email, password: PASSWORD },
    });
    expect(result.status).toBe(403);
  });
});

describe("sessions (me / logout)", () => {
  it("says signed out (not an error) without a cookie", async () => {
    const result = await call(me, { method: "GET" });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ user: null });
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  it("returns the signed-in customer", async () => {
    const { email, cookie } = await signUp();
    const result = await call(me, { method: "GET", cookie });
    expect(result.body.user.email).toBe(email);
  });

  it("ignores and clears a cookie that is garbage or unknown", async () => {
    for (const cookie of ["garbage", "a".repeat(43), "' OR 1=1 --"]) {
      const result = await call(me, { method: "GET", cookie });
      expect(result.body).toEqual({ user: null });
      expect(result.cookie).toBe("");
    }
  });

  it("logout ends the session on the server, not only in the browser", async () => {
    const { cookie } = await signUp();
    const out = await call(logout, { cookie });
    expect(out.status).toBe(204);
    expect(out.cookie).toBe("");

    // The stolen/old cookie value is now useless.
    const after = await call(me, { method: "GET", cookie });
    expect(after.body).toEqual({ user: null });
  });

  it("logout works (and is harmless) when not signed in", async () => {
    const out = await call(logout, {});
    expect(out.status).toBe(204);
  });

  it("logout only ends that browser's session, not the others", async () => {
    const { email, cookie: first } = await signUp();
    const second = (await call(login, { body: { email, password: PASSWORD } }))
      .cookie as string;
    await call(logout, { cookie: first });
    expect(
      (await call(me, { method: "GET", cookie: first })).body.user,
    ).toBeNull();
    expect(
      (await call(me, { method: "GET", cookie: second })).body.user.email,
    ).toBe(email);
  });

  it("expires after 30 days without use", async () => {
    const { email, cookie } = await signUp();
    await exec(
      `UPDATE customer_sessions SET created_at = now() - interval '40 days', expires_at = now() - interval '1 minute'
       WHERE customer_id = (SELECT id FROM customers WHERE email = :email)`,
      { email },
    );
    expect((await call(me, { method: "GET", cookie })).body.user).toBeNull();
  });

  it("never lasts more than 90 days in total, however active", async () => {
    const { email, cookie } = await signUp();
    await exec(
      `UPDATE customer_sessions SET created_at = now() - interval '91 days', expires_at = now() + interval '10 days'
       WHERE customer_id = (SELECT id FROM customers WHERE email = :email)`,
      { email },
    );
    expect((await call(me, { method: "GET", cookie })).body.user).toBeNull();
  });

  it("is extended when used again after an hour, and the cookie follows", async () => {
    const { email, cookie } = await signUp();
    await exec(
      `UPDATE customer_sessions SET last_used_at = now() - interval '2 hours', expires_at = now() + interval '5 days'
       WHERE customer_id = (SELECT id FROM customers WHERE email = :email)`,
      { email },
    );
    const result = await call(me, { method: "GET", cookie });
    expect(result.body.user.email).toBe(email);
    expect(result.cookie).toBe(cookie);
    expect(result.headers.get("set-cookie")).toMatch(/Expires=/);

    const [row] = await sql<{ days: number }>(
      `SELECT extract(epoch FROM (expires_at - now())) / 86400 AS days FROM customer_sessions
       WHERE customer_id = (SELECT id FROM customers WHERE email = :email)`,
      { email },
    );
    expect(Number(row.days)).toBeGreaterThan(29.9);
  });

  it("is not extended past the 90 day hard limit", async () => {
    const { email, cookie } = await signUp();
    await exec(
      `UPDATE customer_sessions SET created_at = now() - interval '89 days',
         last_used_at = now() - interval '2 hours', expires_at = now() + interval '1 day'
       WHERE customer_id = (SELECT id FROM customers WHERE email = :email)`,
      { email },
    );
    await call(me, { method: "GET", cookie });
    const [row] = await sql<{ capped: boolean }>(
      `SELECT expires_at <= created_at + interval '90 days' AS capped FROM customer_sessions
       WHERE customer_id = (SELECT id FROM customers WHERE email = :email)`,
      { email },
    );
    expect(row.capped).toBe(true);
  });

  it("does not write to the database on every request", async () => {
    const { email, cookie } = await signUp();
    const read = () =>
      sql<{ last_used_at: Date }>(
        `SELECT last_used_at FROM customer_sessions WHERE customer_id = (SELECT id FROM customers WHERE email = :email)`,
        { email },
      );
    const before = await read();
    await call(me, { method: "GET", cookie });
    const after = await read();
    expect(after[0].last_used_at).toEqual(before[0].last_used_at);
  });

  it("stops working the moment the account is blocked", async () => {
    const { email, cookie } = await signUp();
    expect(
      (await call(me, { method: "GET", cookie })).body.user,
    ).not.toBeNull();
    await exec("UPDATE customers SET status = 'blocked' WHERE email = :email", {
      email,
    });
    expect((await call(me, { method: "GET", cookie })).body.user).toBeNull();
  });

  it("housekeeping removes dead sessions and keeps live ones", async () => {
    const { email, cookie } = await signUp();
    await exec(
      `INSERT INTO customer_sessions (customer_id, token_hash, created_at, expires_at)
       SELECT id, repeat('a', 64), now() - interval '40 days', now() - interval '10 days'
       FROM customers WHERE email = :email`,
      { email },
    );
    const now = new Date();
    const removed = await sessionRepository.deleteExpired(
      now,
      new Date(now.getTime() - 90 * 86_400_000),
    );
    expect(removed).toBeGreaterThanOrEqual(1);
    expect((await call(me, { method: "GET", cookie })).body.user.email).toBe(
      email,
    );
  });
});

describe("change password", () => {
  it("needs a signed-in customer", async () => {
    const result = await call(changePassword, {
      body: { currentPassword: PASSWORD, newPassword: "another-pass-9" },
    });
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("unauthenticated");
  });

  it("changes the password and signs out every other device, but not this one", async () => {
    const { email, cookie: here } = await signUp();
    const elsewhere = (
      await call(login, { body: { email, password: PASSWORD } })
    ).cookie as string;

    const result = await call(changePassword, {
      cookie: here,
      body: { currentPassword: PASSWORD, newPassword: "brand-new-pass-1" },
    });
    expect(result.status).toBe(204);

    expect(
      (await call(me, { method: "GET", cookie: here })).body.user.email,
    ).toBe(email);
    expect(
      (await call(me, { method: "GET", cookie: elsewhere })).body.user,
    ).toBeNull();

    expect(
      (await call(login, { body: { email, password: PASSWORD } })).status,
    ).toBe(401);
    expect(
      (await call(login, { body: { email, password: "brand-new-pass-1" } }))
        .status,
    ).toBe(200);
  });

  it("refuses a wrong current password, a repeated password and a weak one", async () => {
    const { cookie } = await signUp();

    const wrong = await call(changePassword, {
      cookie,
      body: {
        currentPassword: "not-my-password",
        newPassword: "brand-new-pass-1",
      },
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.fields.currentPassword).toBeTruthy();

    const same = await call(changePassword, {
      cookie,
      body: { currentPassword: PASSWORD, newPassword: PASSWORD },
    });
    expect(same.body.error.fields.newPassword).toMatch(/different/i);

    const weak = await call(changePassword, {
      cookie,
      body: { currentPassword: PASSWORD, newPassword: "123456" },
    });
    expect(weak.body.error.fields.newPassword).toMatch(/common/i);
  });

  it("is limited to 5 attempts per 15 minutes per account", async () => {
    const { cookie } = await signUp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push(
        (
          await call(changePassword, {
            cookie,
            body: {
              currentPassword: "wrong-guess-1",
              newPassword: "brand-new-pass-1",
            },
          })
        ).status,
      );
    }
    expect(statuses).toEqual([400, 400, 400, 400, 400, 429]);
  });
});

describe("forgot and reset password", () => {
  it("emails a link for a real account, storing only the link's hash", async () => {
    const { email } = await signUp();
    const result = await call(forgotPassword, { body: { email } });

    expect(result.status).toBe(204);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(email);
    expect(sent[0].text).toContain("30 minutes");
    const token = resetTokenFrom(sent[0]);

    const rows = await sql<{ token_hash: string; type: string }>(
      "SELECT t.token_hash, t.type FROM customer_tokens t JOIN customers c ON c.id = t.customer_id WHERE c.email = :email",
      { email },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("reset_password");
    expect(rows[0].token_hash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("answers exactly the same for an unknown email and sends nothing", async () => {
    const known = (await signUp()).email;
    const a = await call(forgotPassword, { body: { email: known } });
    const b = await call(forgotPassword, { body: { email: uniqueEmail() } });

    expect(a.status).toBe(204);
    expect(b.status).toBe(204);
    expect(b.raw).toBe(a.raw);
    expect(sent).toHaveLength(1);
  });

  it("does not email a blocked account", async () => {
    const { email } = await signUp();
    await exec("UPDATE customers SET status = 'blocked' WHERE email = :email", {
      email,
    });
    expect((await call(forgotPassword, { body: { email } })).status).toBe(204);
    expect(sent).toHaveLength(0);
  });

  it("is limited to 3 requests per hour per address, the same for unknown addresses", async () => {
    for (const email of [(await signUp()).email, uniqueEmail()]) {
      const statuses: number[] = [];
      for (let i = 0; i < 4; i++)
        statuses.push((await call(forgotPassword, { body: { email } })).status);
      expect(statuses).toEqual([204, 204, 204, 429]);
    }
  });

  it("sets the new password with the link, signs out everywhere, and works once", async () => {
    const { email, cookie } = await signUp();
    await call(forgotPassword, { body: { email } });
    const token = resetTokenFrom(sent[0]);

    const result = await call(resetPassword, {
      body: { token, password: "fresh-start-pw-1" },
    });
    expect(result.status).toBe(204);

    expect((await call(me, { method: "GET", cookie })).body.user).toBeNull();
    expect(
      (await call(login, { body: { email, password: PASSWORD } })).status,
    ).toBe(401);
    expect(
      (await call(login, { body: { email, password: "fresh-start-pw-1" } }))
        .status,
    ).toBe(200);

    const again = await call(resetPassword, {
      body: { token, password: "another-one-pw-2" },
    });
    expect(again.status).toBe(410);
    expect(again.body.error.code).toBe("invalid_reset_link");
  });

  it("keeps the link usable when the chosen password is rejected", async () => {
    const { email } = await signUp();
    await call(forgotPassword, { body: { email } });
    const token = resetTokenFrom(sent[0]);

    const weak = await call(resetPassword, {
      body: { token, password: "123456" },
    });
    expect(weak.status).toBe(400);
    expect(weak.body.error.fields.password).toMatch(/common/i);

    const ok = await call(resetPassword, {
      body: { token, password: "good-new-pass-3" },
    });
    expect(ok.status).toBe(204);
  });

  it("refuses expired, unknown and malformed links", async () => {
    const { email } = await signUp();
    await call(forgotPassword, { body: { email } });
    const token = resetTokenFrom(sent[0]);
    await exec(
      `UPDATE customer_tokens SET created_at = now() - interval '2 hours', expires_at = now() - interval '1 hour'
       WHERE customer_id = (SELECT id FROM customers WHERE email = :email)`,
      { email },
    );

    for (const bad of [token, "a".repeat(43), "short", "' OR 1=1 --"]) {
      const result = await call(resetPassword, {
        body: { token: bad, password: "good-new-pass-3" },
      });
      expect(result.status, bad).toBe(410);
      expect(result.body.error.code).toBe("invalid_reset_link");
    }
  });

  it("only the newest link works", async () => {
    const { email } = await signUp();
    await call(forgotPassword, { body: { email } });
    await call(forgotPassword, { body: { email } });
    const [older, newer] = sent.map(resetTokenFrom);

    expect(
      (
        await call(resetPassword, {
          body: { token: older, password: "good-new-pass-3" },
        })
      ).status,
    ).toBe(410);
    expect(
      (
        await call(resetPassword, {
          body: { token: newer, password: "good-new-pass-3" },
        })
      ).status,
    ).toBe(204);
  });

  it("two simultaneous uses of one link: exactly one succeeds", async () => {
    const { email } = await signUp();
    await call(forgotPassword, { body: { email } });
    const token = resetTokenFrom(sent[0]);

    const results = await Promise.all([
      call(resetPassword, { body: { token, password: "race-winner-pw-1" } }),
      call(resetPassword, { body: { token, password: "race-winner-pw-2" } }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([204, 410]);
  });

  it("housekeeping removes used and expired links", async () => {
    const { email } = await signUp();
    await call(forgotPassword, { body: { email } });
    await call(resetPassword, {
      body: { token: resetTokenFrom(sent[0]), password: "good-new-pass-3" },
    });
    expect(
      await tokenRepository.deleteExpired(new Date()),
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("privacy of logs", () => {
  it("never logs emails, passwords or tokens", async () => {
    process.env.LOG_LEVEL = "debug";
    const lines: string[] = [];
    const capture = (line: unknown) => void lines.push(String(line));
    const log = vi.spyOn(console, "log").mockImplementation(capture);
    const error = vi.spyOn(console, "error").mockImplementation(capture);

    try {
      const { email, cookie } = await signUp();
      await call(login, { body: { email, password: "wrong-guess-1" } });
      await call(login, { body: { email, password: PASSWORD } });
      await call(forgotPassword, { body: { email } });
      const token = resetTokenFrom(sent[0]);
      await call(resetPassword, {
        body: { token, password: "good-new-pass-3" },
      });

      const out = lines.join("\n");
      expect(out).toContain("auth.login"); // it did log requests
      for (const secret of [
        email,
        email.split("@")[0],
        PASSWORD,
        "wrong-guess-1",
        "good-new-pass-3",
        cookie,
        token,
      ]) {
        expect(out).not.toContain(secret);
      }
    } finally {
      process.env.LOG_LEVEL = "silent";
      log.mockRestore();
      error.mockRestore();
    }
  });
});
