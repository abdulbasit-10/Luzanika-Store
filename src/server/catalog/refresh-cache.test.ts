import { describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));

describe("refreshCatalogCache", () => {
  it("expires the catalogue tag at once, and never fails the request when there is no cache to refresh", async () => {
    const { refreshCatalogCache } = await import("./refresh-cache");

    refreshCatalogCache();
    expect(revalidateTag).toHaveBeenLastCalledWith("catalog", { expire: 0 });

    // Outside a running Next.js server (for example in tests) revalidating throws.
    revalidateTag.mockImplementation(() => {
      throw new Error("Invariant: static generation store missing");
    });
    const steps: string[] = [];
    try {
      refreshCatalogCache();
      steps.push("returned");
    } catch (error) {
      steps.push(`threw: ${String(error)}`);
    }

    expect(steps).toEqual(["returned"]);
    expect(revalidateTag).toHaveBeenCalledTimes(2);
  });
});
