import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load() {
  vi.resetModules();
  return (await import("./payment-env")).getPaymentEnv;
}

describe("getPaymentEnv", () => {
  it("defaults to the simulated provider in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENT_PROVIDER", "");
    delete process.env.PAYMENT_PROVIDER;

    expect((await load())().PAYMENT_PROVIDER).toBe("simulated");
  });

  it("accepts stripe, also in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_PROVIDER", "stripe");

    expect((await load())().PAYMENT_PROVIDER).toBe("stripe");
  });

  it("refuses the simulated provider in production, so a live shop can never hand out free orders", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_PROVIDER", "simulated");

    await expect((async () => (await load())())()).rejects.toThrow(
      /not allowed in production/,
    );
  });

  it("refuses the default in production too", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.PAYMENT_PROVIDER;

    await expect((async () => (await load())())()).rejects.toThrow(
      /not allowed in production/,
    );
  });

  it("refuses an unknown provider", async () => {
    vi.stubEnv("PAYMENT_PROVIDER", "paypal");

    await expect((async () => (await load())())()).rejects.toThrow(
      /Invalid PAYMENT_PROVIDER/,
    );
  });
});
