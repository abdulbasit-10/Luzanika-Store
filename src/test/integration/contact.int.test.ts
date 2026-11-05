import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as contactRoute } from "@/app/api/v1/contact/route";
import { setEmailSender, type EmailMessage } from "@/server/email/email-sender";

import { call, newIp, sql, uniqueEmail } from "./helpers";

// Set before the first message: the settings are read once, on first use.
process.env.CONTACT_TO_EMAIL = "inbox@shop.example.com";

let sent: EmailMessage[];

beforeEach(() => {
  sent = [];
  setEmailSender({
    async send(message) {
      sent.push(message);
    },
  });
});

afterEach(() => setEmailSender(undefined));

afterAll(() => {
  delete process.env.CONTACT_TO_EMAIL;
});

const message = (overrides: Record<string, unknown> = {}) => ({
  name: "Ada Lovelace",
  email: uniqueEmail(),
  phone: "+92 300 1234567",
  message: "Hello,\nDo you ship to Lahore?",
  ...overrides,
});

const send = (body: unknown, ip?: string) =>
  call(contactRoute, { method: "POST", body, ip });

describe("POST /api/v1/contact", () => {
  it("emails the message to the shop, for a visitor who is not signed in", async () => {
    const body = message();
    const result = await send(body);

    expect(result.status).toBe(204);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("inbox@shop.example.com");
    // Replying to the email answers the visitor.
    expect(sent[0].replyTo).toBe(body.email);
    expect(sent[0].subject).toContain("Ada Lovelace");
    expect(sent[0].text).toContain("Do you ship to Lahore?");
    expect(sent[0].text).toContain("+92 300 1234567");
  });

  it("accepts an empty phone number", async () => {
    const result = await send(message({ phone: "" }));

    expect(result.status).toBe(204);
    expect(sent[0].text).toContain("(not given)");
  });

  it("explains what is wrong and sends nothing", async () => {
    const result = await send({
      name: "",
      email: "nope",
      phone: "abc",
      message: "",
    });

    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("validation_failed");
    expect(Object.keys(result.body.error.fields).sort()).toEqual([
      "email",
      "message",
      "name",
      "phone",
    ]);
    expect(sent).toHaveLength(0);
  });

  it("refuses fields it does not know, so nobody can choose the recipient", async () => {
    const result = await send(message({ to: "victim@example.com" }));

    expect(result.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("refuses a name that tries to add email headers", async () => {
    const result = await send(
      message({ name: "Ada\r\nBcc: victim@example.com" }),
    );

    expect(result.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("refuses a message that is too long", async () => {
    const result = await send(message({ message: "a".repeat(2001) }));

    expect(result.status).toBe(400);
    expect(result.body.error.fields.message).toMatch(/2000/);
  });

  it("limits one visitor to a few messages an hour", async () => {
    const ip = newIp();
    for (let i = 0; i < 3; i++) {
      expect((await send(message(), ip)).status).toBe(204);
    }

    const blocked = await send(message(), ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("rate_limited");
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(sent).toHaveLength(3);
  });

  it("limits one email address too, even from different visitors", async () => {
    const email = uniqueEmail();
    for (let i = 0; i < 3; i++) {
      expect((await send(message({ email }))).status).toBe(204);
    }

    const blocked = await send(message({ email }));
    expect(blocked.status).toBe(429);
    expect(sent).toHaveLength(3);
  });

  it("still accepts the message when the notification email cannot be sent: it is saved for the admin", async () => {
    setEmailSender({
      async send() {
        throw new Error("connect ECONNREFUSED 10.0.0.5:587");
      },
    });
    const body = message();

    const result = await send(body);

    expect(result.status).toBe(204);
    expect(result.raw).not.toContain("10.0.0.5");
    const saved = await sql<{ email: string; message: string }>(
      "SELECT email::text AS email, message FROM contact_messages WHERE email = :email",
      { email: body.email },
    );
    expect(saved).toEqual([{ email: body.email, message: body.message }]);
  });

  it("saves every accepted message for the admin", async () => {
    const body = message({ phone: "" });

    await send(body);

    const [row] = await sql<{
      name: string;
      phone: string;
      status: string;
    }>(
      "SELECT name, phone, status FROM contact_messages WHERE email = :email",
      { email: body.email },
    );
    expect(row).toEqual({ name: "Ada Lovelace", phone: "", status: "new" });
  });
});
