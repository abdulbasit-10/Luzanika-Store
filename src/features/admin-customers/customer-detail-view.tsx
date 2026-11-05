"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { RegionFlag } from "@/components/shared/region-flag";
import type { AdminOrderStatus } from "@/features/admin-orders/admin-orders-service";
import { dateTimeFormat } from "@/features/admin-orders/order-detail-ui";
import { StatusChip } from "@/features/admin-orders/status-chip";
import { formatMinor } from "@/features/admin-shell/admin-money";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import {
  DetailCard,
  Fact,
  Field,
  FormError,
  inputClass,
  primaryButton,
} from "@/features/admin-shell/admin-ui";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/utils/cn";

import {
  blockCustomer,
  fetchCustomer,
  unblockCustomer,
  type Customer,
} from "./admin-customers-service";
import { CustomerStatusChip, customerName, formatDay } from "./customers-ui";

function useCustomerChange(
  id: string,
  run: () => Promise<unknown>,
  message: string,
  onDone: () => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      toast.success(message);
      onDone();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "customer", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "customers"] }),
      ]);
    },
  });
}

function BlockDialog({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [shown, setShown] = useState(false);
  const block = useCustomerChange(
    customer.id,
    () => blockCustomer(customer.id, reason),
    "Customer blocked",
    onClose,
  );
  const problem = reason.trim() ? undefined : "Please give a reason";

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (!problem) block.mutate();
      }}
      title={`Block ${customerName(customer)}?`}
      description="They are signed out everywhere and cannot sign in. Their orders, cart and wishlist stay."
      confirmLabel="Block customer"
      pendingLabel="Blocking…"
      pending={block.isPending}
    >
      <Field
        id="block-reason"
        label="Reason"
        error={shown ? problem : undefined}
      >
        <textarea
          id="block-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          rows={2}
          aria-invalid={shown && Boolean(problem)}
          aria-describedby="block-reason-error"
          className={cn(inputClass, "h-auto py-2")}
        />
      </Field>
      <FormError error={block.error} />
    </ConfirmDialog>
  );
}

function UnblockDialog({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const unblock = useCustomerChange(
    customer.id,
    () => unblockCustomer(customer.id, note),
    "Customer unblocked",
    onClose,
  );

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => unblock.mutate()}
      title={`Unblock ${customerName(customer)}?`}
      description="They can sign in again."
      confirmLabel="Unblock customer"
      pendingLabel="Saving…"
      pending={unblock.isPending}
    >
      <Field id="unblock-note" label="Note (optional)">
        <input
          id="unblock-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          className={inputClass}
        />
      </Field>
      <FormError error={unblock.error} />
    </ConfirmDialog>
  );
}

/** One customer: details, spending per currency, addresses and orders. */
export function AdminCustomerDetailView({ id }: { id: string }) {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);
  const [dialog, setDialog] = useState<"block" | "unblock" | null>(null);

  const query = useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: () => fetchCustomer(id),
    enabled: can("customers.view"),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 1,
  });
  const customer = query.data;

  let body;
  if (!can("customers.view")) {
    body = (
      <p className="text-sm text-muted-foreground">
        Your role does not include customers.
      </p>
    );
  } else if (query.isPending) {
    body = (
      <p role="status" className="text-sm text-muted-foreground">
        Loading customer…
      </p>
    );
  } else if (!customer) {
    const missing =
      query.error instanceof ApiError && query.error.status === 404;
    body = (
      <p role="alert" className="text-sm text-danger">
        {missing
          ? "There is no such customer."
          : "We couldn't load this customer. Check your connection and reload the page."}
      </p>
    );
  } else {
    body = (
      <>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="truncate text-[clamp(1.25rem,3.8dvh,2rem)] leading-tight font-semibold tracking-[-0.5px] text-[#151d2b]">
              {customerName(customer)}
            </h1>
            <p className="text-[clamp(0.875rem,2.2dvh,1rem)] text-[#6f7b8c]">
              {customer.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomerStatusChip status={customer.status} />
            {can("customers.manage") && customer.status === "active" ? (
              <button
                type="button"
                onClick={() => setDialog("block")}
                className="inline-flex items-center rounded-lg border border-danger bg-white px-4 py-[clamp(0.4rem,1.2dvh,0.625rem)] text-sm font-semibold text-danger hover:bg-danger/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Block
              </button>
            ) : null}
            {can("customers.manage") && customer.status === "blocked" ? (
              <button
                type="button"
                onClick={() => setDialog("unblock")}
                className={primaryButton}
              >
                Unblock
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid items-start gap-[clamp(0.5rem,1.6dvh,1.25rem)] lg:grid-cols-2">
          <DetailCard title="Details">
            <dl className="grid grid-cols-2 gap-3">
              <Fact label="Phone">{customer.phone ?? "—"}</Fact>
              <Fact label="Email confirmed">
                {customer.emailVerified ? "Yes" : "No"}
              </Fact>
              <Fact label="Joined">{formatDay(customer.createdAt)}</Fact>
              <Fact label="Last sign-in">
                {customer.lastLoginAt
                  ? dateTimeFormat.format(new Date(customer.lastLoginAt))
                  : "—"}
              </Fact>
              <Fact label="Browsers signed in">{customer.activeSessions}</Fact>
              <Fact label="Language">{customer.language.toUpperCase()}</Fact>
            </dl>
            {customer.anonymisedAt ? (
              <p className="mt-3 text-sm text-muted-foreground">
                The customer deleted their account on{" "}
                {formatDay(customer.anonymisedAt)}. Their details were wiped;
                the orders remain.
              </p>
            ) : null}
          </DetailCard>

          <DetailCard title="Spending">
            {customer.spend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {customer.spend.map((entry) => (
                  <li
                    key={entry.currency}
                    className="grid grid-cols-4 gap-2 text-sm"
                  >
                    <Fact label="Currency">{entry.currency}</Fact>
                    <Fact label="Orders">{entry.orders}</Fact>
                    <Fact label="Paid">
                      {formatMinor(entry.paid, entry.currency)}
                    </Fact>
                    <Fact label="After refunds">
                      {formatMinor(entry.net, entry.currency)}
                    </Fact>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Rupees and euros are never added together.
            </p>
          </DetailCard>
        </div>

        <DetailCard title={`Orders (${customer.orders.length})`}>
          {customer.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="pb-1 font-medium">
                      Order
                    </th>
                    <th scope="col" className="pb-1 font-medium">
                      Placed
                    </th>
                    <th scope="col" className="pb-1 font-medium">
                      Market
                    </th>
                    <th scope="col" className="pb-1 font-medium">
                      Total
                    </th>
                    <th scope="col" className="pb-1 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.number} className="border-t border-border">
                      <td className="py-2 pr-3 font-medium">
                        <Link
                          href={`/admin/orders/${order.number}`}
                          className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          #{order.number}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        {dateTimeFormat.format(new Date(order.placedAt))}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-1.5">
                          <RegionFlag region={order.market} />
                          {order.market}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {formatMinor(order.total, order.currency)}
                      </td>
                      <td className="py-2">
                        <StatusChip status={order.status as AdminOrderStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>

        <DetailCard title={`Addresses (${customer.addresses.length})`}>
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved addresses.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {customer.addresses.map((address) => (
                <li
                  key={address.id}
                  className="rounded-lg border border-border bg-white p-3 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {address.fullName}
                    {address.isDefault ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground">
                    {address.address}, {address.zip} {address.city},{" "}
                    {address.country}
                  </p>
                  <p className="text-muted-foreground">{address.phone}</p>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        {dialog === "block" ? (
          <BlockDialog customer={customer} onClose={() => setDialog(null)} />
        ) : null}
        {dialog === "unblock" ? (
          <UnblockDialog customer={customer} onClose={() => setDialog(null)} />
        ) : null}
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to Customers
      </Link>
      {body}
    </div>
  );
}
