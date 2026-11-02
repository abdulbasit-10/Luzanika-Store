import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MAIL_FROM",
  "CONTACT_TO_EMAIL",
];

beforeEach(() => {
  for (const key of KEYS) vi.stubEnv(key, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load() {
  vi.resetModules();
  return (await import("./mail-env")).getMailEnv;
}

describe("getMailEnv", () => {
  it("has no mail server when nothing is set", async () => {
    expect((await load())()).toEqual({
      smtp: null,
      from: null,
      contactTo: null,
    });
  });

  it("reads a full configuration", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASSWORD", "secret-value");
    vi.stubEnv("MAIL_FROM", "Luzanika <shop@example.com>");
    vi.stubEnv("CONTACT_TO_EMAIL", "inbox@example.com");

    expect((await load())()).toEqual({
      smtp: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: { user: "mailer", password: "secret-value" },
      },
      from: "Luzanika <shop@example.com>",
      contactTo: "inbox@example.com",
    });
  });

  it("encrypts from the start on port 465 unless told otherwise", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "465");
    vi.stubEnv("MAIL_FROM", "shop@example.com");

    expect((await load())().smtp?.secure).toBe(true);
  });

  it("allows a mail server that needs no login", async () => {
    vi.stubEnv("SMTP_HOST", "localhost");
    vi.stubEnv("SMTP_PORT", "1025");
    vi.stubEnv("MAIL_FROM", "shop@example.com");

    expect((await load())().smtp?.auth).toBeNull();
  });

  it("requires a sender address once a mail server is set", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");

    expect(await load()).toThrow(/MAIL_FROM/);
  });

  it("requires the user and password together", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("MAIL_FROM", "shop@example.com");
    vi.stubEnv("SMTP_USER", "mailer");

    expect(await load()).toThrow(/SMTP_USER, SMTP_PASSWORD/);
  });

  it("refuses a bad receiving address, naming it without printing values", async () => {
    vi.stubEnv("CONTACT_TO_EMAIL", "not-an-email");

    expect(await load()).toThrow(/CONTACT_TO_EMAIL/);
    expect(await load()).not.toThrow(/not-an-email/);
  });

  it("refuses a sender address with a line break", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("MAIL_FROM", "shop@example.com\nBcc: evil@example.com");

    expect(await load()).toThrow(/MAIL_FROM/);
  });

  it("never prints the password in an error", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PASSWORD", "super-secret-value");

    expect(await load()).toThrow();
    expect(await load()).not.toThrow(/super-secret-value/);
  });
});
