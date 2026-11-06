import { describe, expect, it, vi } from "vitest";

import { createResendSender, type FetchLike } from "./resend-sender";

function fakeFetch(status: number, body = "{}") {
  return vi.fn<FetchLike>(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  }));
}

describe("createResendSender", () => {
  it("posts the message to Resend's web API with the key", async () => {
    const fetchFn = fakeFetch(200);
    const sender = createResendSender(
      "re_secret_key",
      "Luzanika <orders@example.com>",
      fetchFn,
    );

    await sender.send({
      to: "ada@example.com",
      subject: "Your order has shipped",
      text: "Hello <b>Ada</b>",
      replyTo: "shop@example.com",
    });

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_secret_key");
    expect(JSON.parse(init.body)).toEqual({
      from: "Luzanika <orders@example.com>",
      to: ["ada@example.com"],
      reply_to: "shop@example.com",
      subject: "Your order has shipped",
      // Plain text only: markup is never interpreted.
      text: "Hello <b>Ada</b>",
    });
  });

  it("leaves out reply_to when there is none", async () => {
    const fetchFn = fakeFetch(200);
    await createResendSender("k", "shop@example.com", fetchFn).send({
      to: "a@example.com",
      subject: "Hi",
      text: "Body",
    });
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).not.toHaveProperty(
      "reply_to",
    );
  });

  it("removes line breaks from the headers", async () => {
    const fetchFn = fakeFetch(200);
    await createResendSender("k", "shop@example.com", fetchFn).send({
      to: "a@example.com\r\nBcc: evil@example.com",
      subject: "Hi\nBcc: evil@example.com",
      text: "Body",
    });
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(sent.to).toEqual(["a@example.com Bcc: evil@example.com"]);
    expect(sent.subject).not.toMatch(/[\r\n]/);
  });

  it("fails with Resend's explanation when it refuses, never with the key", async () => {
    const fetchFn = fakeFetch(
      403,
      JSON.stringify({ message: "The luzanika.com domain is not verified." }),
    );
    const promise = createResendSender(
      "re_secret_key",
      "s@example.com",
      fetchFn,
    ).send({ to: "a@example.com", subject: "Hi", text: "Body" });

    await expect(promise).rejects.toThrow(
      "Resend refused the email (403): The luzanika.com domain is not verified.",
    );
    await expect(promise).rejects.not.toThrow(/re_secret_key/);
  });

  it("fails with just the status when the answer cannot be read", async () => {
    const sender = createResendSender(
      "k",
      "s@example.com",
      fakeFetch(500, "<html>Bad gateway</html>"),
    );
    await expect(
      sender.send({ to: "a@example.com", subject: "Hi", text: "Body" }),
    ).rejects.toThrow("Resend refused the email (500)");
  });

  it("lets a network failure through as an error", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => {
      throw new Error("network down");
    });
    await expect(
      createResendSender("k", "s@example.com", fetchFn).send({
        to: "a@example.com",
        subject: "Hi",
        text: "Body",
      }),
    ).rejects.toThrow("network down");
  });
});
