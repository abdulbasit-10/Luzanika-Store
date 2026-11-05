"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useAdminSession } from "@/features/admin-shell/admin-session";
import { ApiError } from "@/lib/api-client";

import { fetchAdminOrder } from "./order-detail-service";
import { OrderCustomerCard, OrderHistoryCard } from "./order-info-cards";
import { OrderItemsCard } from "./order-items-card";
import { OrderHeader, OrderProgress, OrderSummaryStrip } from "./order-header";
import { OrderPaymentCard } from "./order-payment-card";
import { OrderRefundCard } from "./order-refund-card";
import { OrderStatusCard } from "./order-status-card";

/** One order: what was bought, who it goes to, and every action staff can take on it. */
export function AdminOrderDetailView({ number }: { number: string }) {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);

  const query = useQuery({
    queryKey: ["admin", "order", number],
    queryFn: () => fetchAdminOrder(number),
    enabled: can("orders.view"),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 1,
  });
  const order = query.data;

  const back = (
    <Link
      href="/admin/orders"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Back to Orders
    </Link>
  );

  let body;
  if (!can("orders.view")) {
    body = (
      <p className="text-sm text-muted-foreground">
        Your role does not include orders.
      </p>
    );
  } else if (query.isPending) {
    body = (
      <p role="status" className="text-sm text-muted-foreground">
        Loading order…
      </p>
    );
  } else if (!order) {
    const missing =
      query.error instanceof ApiError && query.error.status === 404;
    body = (
      <p role="alert" className="text-sm text-danger">
        {missing
          ? `There is no order ${number}.`
          : "We couldn't load this order. Check your connection and reload the page."}
      </p>
    );
  } else {
    body = (
      <>
        <OrderHeader order={order} />
        <OrderProgress order={order} />
        <OrderSummaryStrip order={order} />
        <div className="grid items-start gap-[clamp(0.5rem,1.6dvh,1.25rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <OrderCustomerCard order={order} />
          <OrderItemsCard order={order} />
        </div>
        <div className="grid items-start gap-[clamp(0.5rem,1.6dvh,1.25rem)] lg:grid-cols-2">
          <div className="flex flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
            <OrderStatusCard order={order} canManage={can("orders.manage")} />
            <OrderPaymentCard
              order={order}
              canVerify={can("payments.verify")}
            />
            <OrderRefundCard order={order} canRefund={can("orders.refund")} />
          </div>
          <OrderHistoryCard order={order} />
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
      {back}
      {body}
    </div>
  );
}
