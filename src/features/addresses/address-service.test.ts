import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiPut = vi.fn();
const apiDelete = vi.fn();

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
  apiPatch: (...a: unknown[]) => apiPatch(...a),
  apiPut: (...a: unknown[]) => apiPut(...a),
  apiDelete: (...a: unknown[]) => apiDelete(...a),
}));

import { AuthError } from "@/features/auth/auth-service";

import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "./address-service";
import { addressSchema } from "./address-schema";

const home = {
  id: "11111111-1111-1111-1111-111111111111",
  fullName: "Ada",
  phone: "+49 170 1234567",
  country: "Germany",
  city: "Berlin",
  address: "Unter den Linden 1",
  zip: "10117",
  isDefault: true,
};
const { id, ...values } = home;
void id;

function apiError(code: string, status: number, message = code) {
  return new ApiError(message, status, { error: { code, message } });
}

beforeEach(() => {
  for (const mock of [apiGet, apiPost, apiPatch, apiPut, apiDelete]) {
    mock.mockReset();
  }
});

describe("address service", () => {
  it("lists through GET /addresses and returns the items", async () => {
    apiGet.mockResolvedValue({ items: [home] });
    expect(await listAddresses()).toEqual([home]);
    expect(apiGet).toHaveBeenCalledWith("/addresses");
  });

  it("creates through POST /addresses and returns the whole updated list", async () => {
    apiPost.mockResolvedValue({ address: home, items: [home] });
    expect(await createAddress(values)).toEqual([home]);
    expect(apiPost).toHaveBeenCalledWith("/addresses", values);
  });

  it("updates, deletes and sets the default with the id in the path", async () => {
    apiPatch.mockResolvedValue({ items: [home] });
    apiDelete.mockResolvedValue({ items: [] });
    apiPut.mockResolvedValue({ items: [home] });

    await updateAddress(home.id, values);
    expect(apiPatch).toHaveBeenCalledWith(`/addresses/${home.id}`, values);
    expect(await deleteAddress(home.id)).toEqual([]);
    expect(apiDelete).toHaveBeenCalledWith(`/addresses/${home.id}`);
    await setDefaultAddress(home.id);
    expect(apiPut).toHaveBeenCalledWith(`/addresses/${home.id}/default`);
  });

  it("encodes the id so it can never change the request path", async () => {
    apiDelete.mockResolvedValue({ items: [] });
    await deleteAddress("../account");
    expect(apiDelete).toHaveBeenCalledWith("/addresses/..%2Faccount");
  });

  it("keeps the server's field messages and its own explanation", async () => {
    apiPost.mockRejectedValueOnce(
      new ApiError("x", 400, {
        error: {
          code: "validation_failed",
          message: "Please check the highlighted fields.",
          fields: { phone: "Please enter a valid phone number" },
        },
      }),
    );
    const invalid = await createAddress(values).catch((e: unknown) => e);
    expect(invalid).toBeInstanceOf(AuthError);
    expect((invalid as AuthError).fields).toEqual({
      phone: "Please enter a valid phone number",
    });

    apiPost.mockRejectedValueOnce(
      apiError("unprocessable", 422, "You can save up to 20 addresses."),
    );
    const full = (await createAddress(values).catch(
      (e: unknown) => e,
    )) as AuthError;
    expect(full.code).toBe("unprocessable");
    expect(full.serverMessage).toBe("You can save up to 20 addresses.");
  });

  it("reports a missing address, an ended session and rate limits as AuthErrors", async () => {
    for (const code of ["not_found", "unauthenticated", "rate_limited"]) {
      apiDelete.mockRejectedValueOnce(apiError(code, 400));
      const failure = await deleteAddress(home.id).catch((e: unknown) => e);
      expect((failure as AuthError).code).toBe(code);
    }
  });

  it("lets network and server failures through untouched", async () => {
    const network = new ApiError("Unable to reach the server.", null);
    apiGet.mockRejectedValue(network);
    await expect(listAddresses()).rejects.toBe(network);
  });
});

describe("address form rules", () => {
  const valid = { ...values };

  it("accepts a normal address", () => {
    expect(addressSchema.safeParse(valid).success).toBe(true);
  });

  it("uses the same phone rule as the server (6 to 19 digits, optional +)", () => {
    expect(
      addressSchema.safeParse({ ...valid, phone: "+" + "1".repeat(19) })
        .success,
    ).toBe(true);
    expect(
      addressSchema.safeParse({ ...valid, phone: "+" + "1".repeat(20) })
        .success,
    ).toBe(false);
    expect(addressSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(
      false,
    );
  });

  it("requires every text field and keeps them within the server's limits", () => {
    for (const field of [
      "fullName",
      "phone",
      "country",
      "city",
      "address",
      "zip",
    ] as const) {
      expect(
        addressSchema.safeParse({ ...valid, [field]: "" }).success,
        field,
      ).toBe(false);
    }
    expect(
      addressSchema.safeParse({ ...valid, fullName: "x".repeat(81) }).success,
    ).toBe(false);
    expect(
      addressSchema.safeParse({ ...valid, zip: "1".repeat(13) }).success,
    ).toBe(false);
    expect(
      addressSchema.safeParse({ ...valid, address: "x".repeat(161) }).success,
    ).toBe(false);
  });
});
