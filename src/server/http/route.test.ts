import { notFound } from "next/navigation";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError } from "./api-error";
import { json } from "./responses";
import { route } from "./route";

const env = {
  NODE_ENV: "development" as "development" | "production",
  TRUST_PROXY: true,
  APP_ORIGINS: undefined as string[] | undefined,
};

vi.mock("@/server/config/http-env", () => ({ getHttpEnv: () => env }));

let ipCounter = 0;
/** A fresh visitor per test so rate-limit state never leaks between tests. */
function newIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function request(
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
) {
  return new NextRequest(`https://luzanika.com${path}`, {
    method: init.method ?? "GET",
    headers: { "x-real-ip": newIp(), ...init.headers },
    body: init.body,
  });
}

beforeEach(() => {
  env.NODE_ENV = "development";
  env.APP_ORIGINS = undefined;
  env.TRUST_PROXY = true;
});

describe("route(): success path", () => {
  it("adds request id, no-store and nosniff headers", async () => {
    const GET = route({ name: "t.ok" }, () => json({ hello: "world" }));
    const response = await GET(request("/api/v1/t"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hello: "world" });
    expect(response.headers.get("x-request-id")).toMatch(/^req_[0-9a-f]{32}$/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("ratelimit-remaining")).toBeTruthy();
  });

  it("gives every request its own id", async () => {
    const GET = route({ name: "t.ids" }, () => json({}));
    const a = await GET(request("/x"));
    const b = await GET(request("/x"));
    expect(a.headers.get("x-request-id")).not.toBe(
      b.headers.get("x-request-id"),
    );
  });

  it("keeps a cache header the handler set on purpose", async () => {
    const GET = route({ name: "t.cache" }, () =>
      json({}, { headers: { "Cache-Control": "public, max-age=60" } }),
    );
    const response = await GET(request("/x"));
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("resolves dynamic params", async () => {
    const GET = route<{ id: string }>({ name: "t.params" }, ({ params }) =>
      json({ id: params.id }),
    );
    const response = await GET(request("/x/42"), {
      params: Promise.resolve({ id: "42" }),
    });
    expect(await response.json()).toEqual({ id: "42" });
  });
});

describe("route(): errors", () => {
  it("turns an ApiError into the standard envelope with the request id", async () => {
    const GET = route({ name: "t.err" }, () => {
      throw new ApiError("not_found");
    });
    const response = await GET(request("/x"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
    expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
    expect(body.error.fields).toBeUndefined();
  });

  it("never leaks the message, stack or cause of an unexpected error", async () => {
    const GET = route({ name: "t.boom" }, () => {
      throw new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2");
    });
    const response = await GET(request("/x"));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text).error.code).toBe("internal_error");
    expect(text).not.toMatch(/ECONNREFUSED|hunter2|10\.0\.0\.5|at .*\.ts/);
  });

  it("maps a database connection failure to 503 with Retry-After", async () => {
    class SequelizeConnectionRefusedError extends Error {
      name = "SequelizeConnectionRefusedError";
    }
    const GET = route({ name: "t.db" }, () => {
      throw new SequelizeConnectionRefusedError("secret host details");
    });
    const response = await GET(request("/x"));

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(await response.text()).not.toContain("secret host details");
  });

  it("lets Next.js framework signals pass through instead of turning them into a 500", async () => {
    const GET = route({ name: "t.next" }, () => notFound());
    await expect(GET(request("/x"))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK"),
    });
  });

  it("turns a thrown ZodError into validation_failed", async () => {
    const GET = route({ name: "t.zod" }, () => {
      z.object({ a: z.string("Required") }).parse({});
      return json({});
    });
    const response = await GET(request("/x"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.fields).toEqual({ a: "Required" });
  });
});

describe("route(): request helpers", () => {
  const schema = z.object({ email: z.string().email("Bad email") }).strict();

  it("json() returns validated data", async () => {
    const POST = route({ name: "t.json" }, async ({ json: read }) =>
      json(await read(schema)),
    );
    const response = await POST(
      request("/x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"email":"a@b.co"}',
      }),
    );
    expect(await response.json()).toEqual({ email: "a@b.co" });
  });

  it("json() rejects unknown fields on strict schemas and bad values with 400", async () => {
    const POST = route({ name: "t.json2" }, async ({ json: read }) =>
      json(await read(schema)),
    );
    const response = await POST(
      request("/x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"email":"nope","isAdmin":true}',
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.fields.email).toBe("Bad email");
  });

  it("json() honours the route's body size limit", async () => {
    const POST = route(
      { name: "t.limit", maxBodyBytes: 20 },
      async ({ json: read }) => json(await read(z.unknown())),
    );
    const response = await POST(
      request("/x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "x".repeat(100) }),
      }),
    );
    expect(response.status).toBe(413);
  });

  it("query() validates the query string", async () => {
    const GET = route({ name: "t.query" }, ({ query }) =>
      json(
        query(z.object({ page: z.coerce.number().int().min(1).default(1) })),
      ),
    );
    expect(await (await GET(request("/x?page=3"))).json()).toEqual({ page: 3 });
    expect((await GET(request("/x?page=abc"))).status).toBe(400);
  });
});

describe("route(): origin (CSRF) check", () => {
  const POST = route({ name: "t.csrf" }, () => json({ done: true }));

  it("blocks a data-changing request from another site", async () => {
    const response = await POST(
      request("/x", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("csrf_failed");
  });

  it("allows the site's own origin", async () => {
    const response = await POST(
      request("/x", {
        method: "POST",
        headers: { origin: "https://luzanika.com" },
      }),
    );
    expect(response.status).toBe(200);
  });

  it("does not apply to reads", async () => {
    const GET = route({ name: "t.csrf.get" }, () => json({}));
    const response = await GET(
      request("/x", { headers: { origin: "https://evil.example" } }),
    );
    expect(response.status).toBe(200);
  });

  it("can be switched off for signed webhooks", async () => {
    const hook = route({ name: "t.hook", csrf: false }, () => json({}));
    const response = await hook(
      request("/x", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(response.status).toBe(200);
  });

  it("fails closed in production without APP_ORIGINS", async () => {
    env.NODE_ENV = "production";
    const response = await POST(request("/x", { method: "POST" }));
    expect(response.status).toBe(500);
  });

  it("a blocked cross-site request does not burn the visitor's rate limit", async () => {
    const strict = route(
      { name: "t.csrf.rl", rateLimit: { limit: 2, windowSec: 60 } },
      () => json({}),
    );
    const ip = newIp();
    for (let i = 0; i < 5; i++) {
      const blocked = await strict(
        new NextRequest("https://luzanika.com/x", {
          method: "POST",
          headers: { "x-real-ip": ip, origin: "https://evil.example" },
        }),
      );
      expect(blocked.status).toBe(403);
    }
    const legit = await strict(
      new NextRequest("https://luzanika.com/x", {
        method: "POST",
        headers: { "x-real-ip": ip, origin: "https://luzanika.com" },
      }),
    );
    expect(legit.status).toBe(200);
  });
});

describe("route(): rate limiting", () => {
  it("returns 429 with Retry-After after the route limit", async () => {
    const POST = route(
      { name: "t.rl", rateLimit: { limit: 2, windowSec: 60 } },
      () => json({}),
    );
    const ip = newIp();
    const send = () =>
      POST(
        new NextRequest("https://luzanika.com/x", {
          method: "POST",
          headers: { "x-real-ip": ip },
        }),
      );

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const blocked = await send();
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe("rate_limited");
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("limits visitors independently", async () => {
    const GET = route(
      { name: "t.rl2", rateLimit: { limit: 1, windowSec: 60 } },
      () => json({}),
    );
    expect((await GET(request("/x"))).status).toBe(200);
    expect((await GET(request("/x"))).status).toBe(200);
  });

  it("shares one global budget across routes for the same visitor", async () => {
    const a = route({ name: "t.g1" }, () => json({}));
    const b = route({ name: "t.g2" }, () => json({}));
    const ip = newIp();
    const make = () =>
      new NextRequest("https://luzanika.com/x", {
        headers: { "x-real-ip": ip },
      });
    const first = await a(make());
    const second = await b(make());
    expect(Number(second.headers.get("ratelimit-remaining"))).toBe(
      Number(first.headers.get("ratelimit-remaining")) - 1,
    );
  });
});

describe("route(): logging", () => {
  let lines: string[];

  beforeEach(() => {
    process.env.LOG_LEVEL = "info";
    lines = [];
    const capture = (line: unknown) => void lines.push(String(line));
    vi.spyOn(console, "log").mockImplementation(capture);
    vi.spyOn(console, "error").mockImplementation(capture);
  });

  afterEach(() => {
    process.env.LOG_LEVEL = "silent";
    vi.restoreAllMocks();
  });

  it("logs the path but never the query string, IP or headers", async () => {
    const GET = route({ name: "t.log" }, () => json({}));
    await GET(
      request("/api/v1/reset?token=SECRET123&email=jane@example.com", {
        headers: { cookie: "__Host-lz_session=SESSIONVALUE" },
      }),
    );

    const out = lines.join("\n");
    expect(out).toContain("/api/v1/reset");
    expect(out).not.toMatch(/SECRET123|jane@example|SESSIONVALUE|198\.51\.100/);
  });

  it("logs the error detail server-side for 500s only", async () => {
    const GET = route({ name: "t.log2" }, () => {
      throw new Error("kaboom");
    });
    await GET(request("/x"));
    expect(lines.join("\n")).toContain("kaboom");
  });

  it("stays quiet for successful health-style requests", async () => {
    const GET = route({ name: "t.quiet", quiet: true }, () => json({}));
    await GET(request("/x"));
    expect(lines).toHaveLength(0);
  });
});
