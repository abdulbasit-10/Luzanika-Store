import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";

const apiPost = vi.fn();
const apiGet = vi.fn();

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiGet: (...args: unknown[]) => apiGet(...args),
}));

import {
  AuthError,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  updateProfile,
} from "./auth-service";

const dto = {
  id: "11111111-1111-1111-1111-111111111111",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  language: "en",
};

function apiError(
  code: string,
  status: number,
  fields?: Record<string, string>,
) {
  return new ApiError(code, status, { error: { code, message: code, fields } });
}

beforeEach(() => {
  apiPost.mockReset();
  apiGet.mockReset();
});

describe("auth service", () => {
  it("registers through POST /auth/register and returns the user", async () => {
    apiPost.mockResolvedValue({ user: dto });
    const user = await registerUser({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "a-good-password",
    });

    expect(apiPost).toHaveBeenCalledWith("/auth/register", {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "a-good-password",
    });
    expect(user).toMatchObject({
      id: dto.id,
      firstName: "Ada",
      email: "ada@example.com",
      language: "en",
    });
  });

  it("only includes optional profile fields the server actually sent", async () => {
    apiGet.mockResolvedValue({
      user: {
        ...dto,
        phone: "+49 170 1234",
        gender: "female",
        dateOfBirth: "1990-05-01",
      },
    });
    const user = await getCurrentUser();
    expect(user).toMatchObject({
      phone: "+49 170 1234",
      gender: "female",
      dateOfBirth: "1990-05-01",
    });

    apiGet.mockResolvedValue({ user: dto });
    const minimal = await getCurrentUser();
    expect(minimal).not.toHaveProperty("phone");
    expect(minimal).not.toHaveProperty("gender");
  });

  it("answers null when nobody is signed in", async () => {
    apiGet.mockResolvedValue({ user: null });
    expect(await getCurrentUser()).toBeNull();
    expect(apiGet).toHaveBeenCalledWith("/auth/me");
  });

  it("never exposes anything beyond the user fields it knows", async () => {
    apiPost.mockResolvedValue({
      user: { ...dto, passwordHash: "$2b$12$x", status: "blocked" },
    });
    const user = await loginUser({ email: "ada@example.com", password: "x" });
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("status");
  });

  it("turns known API error codes into AuthError, keeping field messages", async () => {
    apiPost.mockRejectedValue(
      apiError("email_taken", 409, {
        email: "An account with this email already exists",
      }),
    );
    const failure = await registerUser({
      firstName: "A",
      lastName: "B",
      email: "a@b.co",
      password: "a-good-password",
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AuthError);
    expect((failure as AuthError).code).toBe("email_taken");
    expect((failure as AuthError).fields).toEqual({
      email: "An account with this email already exists",
    });
  });

  it("maps invalid credentials, rate limits and bad reset links", async () => {
    for (const [code, call] of [
      [
        "invalid_credentials",
        () => loginUser({ email: "a@b.co", password: "x" }),
      ],
      ["rate_limited", () => requestPasswordReset("a@b.co")],
      [
        "invalid_reset_link",
        () => resetPassword({ token: "t", password: "a-good-password" }),
      ],
    ] as const) {
      apiPost.mockRejectedValueOnce(apiError(code, 400));
      const failure = await call().catch((error: unknown) => error);
      expect(failure, code).toBeInstanceOf(AuthError);
      expect((failure as AuthError).code).toBe(code);
    }
  });

  it("keeps the 'email not registered' message for the forgot-password field", async () => {
    apiPost.mockRejectedValue(
      apiError("email_not_registered", 404, {
        email: "This email is not registered with us",
      }),
    );
    const failure = await requestPasswordReset("nobody@example.com").catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(AuthError);
    expect((failure as AuthError).code).toBe("email_not_registered");
    expect((failure as AuthError).fields).toEqual({
      email: "This email is not registered with us",
    });
  });

  it("lets unexpected failures through untouched (network down, server error)", async () => {
    const network = new ApiError("Unable to reach the server.", null);
    apiPost.mockRejectedValue(network);
    await expect(loginUser({ email: "a@b.co", password: "x" })).rejects.toBe(
      network,
    );

    const serverError = apiError("internal_error", 500);
    apiPost.mockRejectedValue(serverError);
    await expect(loginUser({ email: "a@b.co", password: "x" })).rejects.toBe(
      serverError,
    );
  });

  it("sends the reset token and new password, and the email for a link request", async () => {
    apiPost.mockResolvedValue(undefined);
    await resetPassword({ token: "tok", password: "a-good-password" });
    expect(apiPost).toHaveBeenCalledWith("/auth/reset-password", {
      token: "tok",
      password: "a-good-password",
    });
    await requestPasswordReset("ada@example.com");
    expect(apiPost).toHaveBeenCalledWith("/auth/forgot-password", {
      email: "ada@example.com",
    });
  });

  it("logs out through POST /auth/logout", async () => {
    apiPost.mockResolvedValue(undefined);
    await logoutUser();
    expect(apiPost).toHaveBeenCalledWith("/auth/logout");
  });

  it("does not pretend to save profile changes that have no backend yet", async () => {
    await expect(updateProfile("id", { firstName: "X" })).rejects.toMatchObject(
      { code: "not_available" },
    );
    expect(apiPost).not.toHaveBeenCalled();
  });
});
