import { describe, expect, it, vi } from "vitest";

import { cleanHeader, createSmtpSender } from "./smtp-sender";

describe("cleanHeader", () => {
  it("removes line breaks, which are how extra headers are injected", () => {
    expect(cleanHeader("Hi\r\nBcc: evil@example.com")).toBe(
      "Hi Bcc: evil@example.com",
    );
    expect(cleanHeader("a\nb\rc\u2028d")).toBe("a b c d");
  });

  it("removes other control characters and trims", () => {
    expect(cleanHeader("  hello\u0000\u0007 world  ")).toBe("hello world");
  });

  it("leaves a normal value alone", () => {
    expect(cleanHeader("Luzanika <shop@example.com>")).toBe(
      "Luzanika <shop@example.com>",
    );
  });
});

describe("createSmtpSender", () => {
  it("sends the message from the configured address", async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const sender = createSmtpSender(
      { sendMail },
      "Luzanika <shop@example.com>",
    );

    await sender.send({
      to: "ada@example.com",
      subject: "Reset your password",
      text: "Open the link.",
    });

    expect(sendMail).toHaveBeenCalledWith({
      from: "Luzanika <shop@example.com>",
      to: "ada@example.com",
      subject: "Reset your password",
      text: "Open the link.",
    });
  });

  it("passes a reply-to address only when there is one", async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const sender = createSmtpSender({ sendMail }, "shop@example.com");

    await sender.send({
      to: "shop@example.com",
      replyTo: "visitor@example.com",
      subject: "Hello",
      text: "Hi",
    });

    expect(sendMail.mock.calls[0][0]).toMatchObject({
      replyTo: "visitor@example.com",
    });
  });

  it("never lets a line break reach a header", async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const sender = createSmtpSender({ sendMail }, "shop@example.com");

    await sender.send({
      to: "shop@example.com",
      replyTo: "a@example.com\r\nBcc: evil@example.com",
      subject: "New message from Ada\r\nBcc: evil@example.com",
      text: "Hi",
    });

    const sent = sendMail.mock.calls[0][0];
    for (const header of [sent.to, sent.replyTo, sent.subject, sent.from]) {
      expect(header).not.toMatch(/[\r\n]/);
    }
  });

  it("lets a failure of the mail server reach the caller", async () => {
    const sender = createSmtpSender(
      { sendMail: vi.fn().mockRejectedValue(new Error("connection refused")) },
      "shop@example.com",
    );

    await expect(
      sender.send({ to: "a@example.com", subject: "s", text: "t" }),
    ).rejects.toThrow("connection refused");
  });
});
