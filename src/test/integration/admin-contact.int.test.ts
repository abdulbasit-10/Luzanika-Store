import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as listRoute } from "@/app/api/v1/admin/contact/route";
import { GET as getRoute } from "@/app/api/v1/admin/contact/[id]/route";
import { POST as replyRoute } from "@/app/api/v1/admin/contact/[id]/reply/route";
import { POST as contactRoute } from "@/app/api/v1/contact/route";
import { setEmailSender, type EmailMessage } from "@/server/email/email-sender";

import { signedInStaff } from "./admin-helpers";
import { call, exec, newIp, sql, uniqueEmail } from "./helpers";

let sent: EmailMessage[];
let failEmail = false;

beforeEach(async () => {
  await exec("DELETE FROM contact_messages");
  sent = [];
  failEmail = false;
  setEmailSender({
    async send(message) {
      if (failEmail) throw new Error("mail server down");
      sent.push(message);
    },
  });
});

afterEach(() => setEmailSender(undefined));

/** A visitor writes through the contact form. */
async function write(over: Record<string, unknown> = {}) {
  const body = {
    name: "Ada Lovelace",
    email: uniqueEmail(),
    phone: "+92 300 1234567",
    message: "Hello,\nDo you ship to Lahore?",
    ...over,
  };
  const result = await call(contactRoute, {
    method: "POST",
    body,
    ip: newIp(),
  });
  expect(result.status).toBe(204);
  sent = [];
  return body;
}

const reader = () => signedInStaff({ permissions: ["contact.view"] });
const replier = () =>
  signedInStaff({ permissions: ["contact.view", "contact.reply"] });

const list = (cookie: string | undefined, query = "") =>
  call(listRoute, {
    method: "GET",
    staffCookie: cookie,
    path: `/api/v1/admin/contact${query}`,
  });
const get = (cookie: string | undefined, id: string) =>
  call(getRoute, { method: "GET", staffCookie: cookie, params: { id } });
const reply = (cookie: string | undefined, id: string, body: unknown) =>
  call(replyRoute, {
    method: "POST",
    staffCookie: cookie,
    params: { id },
    body,
  });

async function firstId(cookie: string): Promise<string> {
  return (await list(cookie)).body.items[0].id as string;
}

describe("the contact form saves messages", () => {
  it("keeps the message for the admin, and still tells the visitor it arrived when the notification email fails", async () => {
    failEmail = true;
    const body = {
      name: "Ada Lovelace",
      email: uniqueEmail(),
      phone: "",
      message: "Is the cashmere overshirt back in stock?",
    };

    const result = await call(contactRoute, {
      method: "POST",
      body,
      ip: newIp(),
    });

    expect(result.status).toBe(204);
    const rows = await sql<{ name: string; email: string; status: string }>(
      "SELECT name, email::text AS email, status FROM contact_messages",
    );
    expect(rows).toEqual([
      { name: "Ada Lovelace", email: body.email, status: "new" },
    ]);
  });

  it("does not save a message that is refused", async () => {
    const result = await call(contactRoute, {
      method: "POST",
      body: { name: "", email: "nope", phone: "", message: "" },
      ip: newIp(),
    });
    expect(result.status).toBe(400);
    expect(await sql("SELECT 1 FROM contact_messages")).toHaveLength(0);
  });
});

describe("who may see and answer messages", () => {
  it("needs a signed-in staff member with the right permission", async () => {
    await write();
    const nothing = await signedInStaff({ permissions: ["orders.view"] });
    const viewer = await reader();
    const id = await firstId(viewer.cookie);

    expect((await list(undefined)).status).toBe(401);
    expect((await get(undefined, id)).status).toBe(401);
    expect((await reply(undefined, id, { message: "Hi" })).status).toBe(401);
    expect((await list(nothing.cookie)).status).toBe(403);
    expect((await get(nothing.cookie, id)).status).toBe(403);
    expect((await list(viewer.cookie)).status).toBe(200);
    expect((await get(viewer.cookie, id)).status).toBe(200);
    // Reading is not answering.
    expect((await reply(viewer.cookie, id, { message: "Hi" })).status).toBe(
      403,
    );
    expect(sent).toHaveLength(0);
  });

  it("treats a malformed or unknown id as not found", async () => {
    const staff = await replier();
    expect((await get(staff.cookie, "nope")).status).toBe(404);
    expect(
      (await get(staff.cookie, "00000000-0000-4000-8000-000000000000")).status,
    ).toBe(404);
    expect(
      (
        await reply(staff.cookie, "00000000-0000-4000-8000-000000000000", {
          message: "Hi",
        })
      ).status,
    ).toBe(404);
  });
});

describe("the message list", () => {
  it("lists newest first with a preview-ready text, and filters by status and search", async () => {
    const staff = await replier();
    await write({ name: "Older Person", message: "About my order please" });
    await write({ name: "Newer Person", message: "Do you sell perfume?" });

    const all = await list(staff.cookie);
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(2);
    expect(all.body.items.map((item: { name: string }) => item.name)).toEqual([
      "Newer Person",
      "Older Person",
    ]);
    expect(all.body.items[0]).toMatchObject({
      status: "new",
      replyCount: 0,
      repliedAt: null,
    });

    expect(
      (await list(staff.cookie, "?search=perfume")).body.items,
    ).toHaveLength(1);
    expect((await list(staff.cookie, "?search=Older")).body.items).toHaveLength(
      1,
    );
    expect((await list(staff.cookie, "?status=replied")).body.items).toEqual(
      [],
    );
    expect((await list(staff.cookie, "?status=nonsense")).status).toBe(400);

    // % is plain text, not a wildcard.
    expect((await list(staff.cookie, "?search=%25")).body.items).toEqual([]);
  });
});

describe("answering a message", () => {
  it("emails the visitor, records the reply, marks the message replied, and writes the audit log", async () => {
    const staff = await replier();
    const visitor = await write({
      name: "Ada Lovelace",
      message: "Do you ship to Lahore?\nAnd how long does it take?",
    });
    const id = await firstId(staff.cookie);

    const result = await reply(staff.cookie, id, {
      message: "Yes, we ship to Lahore.\nUsually 3 to 5 days.",
    });

    expect(result.status).toBe(200);
    expect(result.body.message).toMatchObject({
      id,
      status: "replied",
      replyCount: 1,
    });
    expect(result.body.message.repliedAt).toBeTruthy();
    expect(result.body.message.replies).toHaveLength(1);
    expect(result.body.message.replies[0]).toMatchObject({
      body: "Yes, we ship to Lahore.\nUsually 3 to 5 days.",
      by: { id: staff.id },
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(visitor.email);
    expect(sent[0].subject).toContain("Luzanika");
    expect(sent[0].text).toContain("Hi Ada Lovelace,");
    expect(sent[0].text).toContain("Yes, we ship to Lahore.");
    // The visitor's own message is quoted, line by line.
    expect(sent[0].text).toContain("> Do you ship to Lahore?");
    expect(sent[0].text).toContain("> And how long does it take?");
    // Their answer goes to the shop's contact address.
    expect(sent[0].replyTo).toBeTruthy();

    expect((await list(staff.cookie, "?status=new")).body.items).toEqual([]);
    expect(
      (await list(staff.cookie, "?status=replied")).body.items,
    ).toHaveLength(1);

    const [audit] = await sql<{
      staff_email: string;
      action: string;
      after: Record<string, unknown>;
    }>(
      "SELECT staff_email, action, after FROM audit_log WHERE entity_type = 'contact_message' AND entity_id = :id",
      { id },
    );
    expect(audit.action).toBe("contact.reply");
    expect(audit.staff_email).toBe(staff.email);
    expect(audit.after).toMatchObject({ status: "replied", to: visitor.email });
    // The reply text is in the replies table, not copied into the audit log.
    expect(JSON.stringify(audit.after)).not.toContain("Usually 3 to 5 days");
  });

  it("allows more than one reply, oldest first", async () => {
    const staff = await replier();
    await write();
    const id = await firstId(staff.cookie);

    await reply(staff.cookie, id, { message: "First answer" });
    const second = await reply(staff.cookie, id, { message: "Second answer" });

    expect(second.status).toBe(200);
    expect(second.body.message.replyCount).toBe(2);
    expect(
      second.body.message.replies.map((r: { body: string }) => r.body),
    ).toEqual(["First answer", "Second answer"]);
    expect(sent).toHaveLength(2);
    const detail = await get(staff.cookie, id);
    expect(detail.body.message.replies).toHaveLength(2);
  });

  it("saves nothing and keeps the message new when the email cannot be sent", async () => {
    const staff = await replier();
    await write();
    const id = await firstId(staff.cookie);
    failEmail = true;

    const result = await reply(staff.cookie, id, { message: "Hello again" });

    expect(result.status).toBe(503);
    expect(result.body.error.code).toBe("service_unavailable");
    expect(result.raw).not.toContain("mail server down");
    const detail = await get(staff.cookie, id);
    expect(detail.body.message).toMatchObject({
      status: "new",
      replyCount: 0,
      replies: [],
    });
    expect(
      await sql(
        "SELECT 1 FROM audit_log WHERE action = 'contact.reply' AND entity_id = :id",
        { id },
      ),
    ).toHaveLength(0);

    // Trying again works once the mail server is back.
    failEmail = false;
    expect(
      (await reply(staff.cookie, id, { message: "Hello again" })).status,
    ).toBe(200);
  });

  it("refuses an empty or oversized reply and fields it does not know", async () => {
    const staff = await replier();
    await write();
    const id = await firstId(staff.cookie);

    for (const body of [
      {},
      { message: "   " },
      { message: "x".repeat(5001) },
      { message: "Hi", to: "victim@example.com" },
      { message: "Hi\u0000there" },
    ]) {
      expect(
        (await reply(staff.cookie, id, body)).status,
        JSON.stringify(body),
      ).toBe(400);
    }
    expect(sent).toHaveLength(0);
  });
});
