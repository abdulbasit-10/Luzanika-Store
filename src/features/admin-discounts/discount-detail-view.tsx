"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useAdminSession } from "@/features/admin-shell/admin-session";
import { ApiError } from "@/lib/api-client";

import { fetchDiscount } from "./admin-discounts-service";
import { DiscountForm } from "./discount-form";
import { DiscountStatusChip } from "./discounts-ui";

/** One discount to change; without an id, a new one to make. */
export function AdminDiscountDetailView({ id }: { id?: string }) {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);

  const query = useQuery({
    queryKey: ["admin", "discounts", "one", id],
    queryFn: () => fetchDiscount(id as string),
    enabled: Boolean(id) && can("discounts.view"),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 1,
  });
  const discount = query.data;

  let body;
  if (!can(id ? "discounts.view" : "discounts.manage")) {
    body = (
      <p className="text-sm text-muted-foreground">
        Your role does not include this.
      </p>
    );
  } else if (!id) {
    body = (
      <>
        <h1 className="text-[clamp(1.25rem,3.8dvh,2rem)] leading-tight font-semibold tracking-[-0.5px] text-[#151d2b]">
          Add Discount
        </h1>
        <DiscountForm canManage />
      </>
    );
  } else if (query.isPending) {
    body = (
      <p role="status" className="text-sm text-muted-foreground">
        Loading discount…
      </p>
    );
  } else if (!discount) {
    const missing =
      query.error instanceof ApiError && query.error.status === 404;
    body = (
      <p role="alert" className="text-sm text-danger">
        {missing
          ? "There is no such discount."
          : "We couldn't load this discount. Check your connection and reload the page."}
      </p>
    );
  } else {
    body = (
      <>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h1 className="min-w-0 truncate text-[clamp(1.25rem,3.8dvh,2rem)] leading-tight font-semibold tracking-[-0.5px] text-[#151d2b]">
            {discount.name}
          </h1>
          <DiscountStatusChip status={discount.status} />
        </div>
        {/* Keyed by the last save, so the boxes show what was saved. */}
        <DiscountForm
          key={discount.updatedAt}
          discount={discount}
          canManage={can("discounts.manage")}
        />
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
      <Link
        href="/admin/discounts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to Discounts
      </Link>
      {body}
    </div>
  );
}
