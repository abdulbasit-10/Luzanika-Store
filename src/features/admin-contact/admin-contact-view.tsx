"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { dateTimeFormat } from "@/features/admin-orders/order-detail-ui";
import { OrdersPagination } from "@/features/admin-orders/orders-table";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import {
  SearchBox,
  TableMessage,
  bodyCell,
  filterBarClass,
  filterBoxClass,
  headCell,
  tableCardClass,
  useDebounced,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import {
  fetchContactMessages,
  type ContactStatus,
} from "./admin-contact-service";
import { ContactStatusChip } from "./contact-ui";

const PAGE_SIZE = 10;

/** Contact Us: what visitors wrote through the contact form, newest first. A click opens the message and its reply box. */
export function AdminContactView() {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);
  const router = useRouter();

  const [search, setSearch] = useState("");
  // Messages nobody answered yet are what staff come for.
  const [status, setStatus] = useState<ContactStatus | "">("new");
  const [page, setPage] = useState(1);
  const settled = useDebounced(search);

  const filters = {
    status: status || undefined,
    search: settled || undefined,
  };
  const messages = useQuery({
    queryKey: ["admin", "contact", filters, page],
    queryFn: () => fetchContactMessages(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: can("contact.view"),
    staleTime: 10_000,
  });
  const rows = messages.data?.items ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((messages.data?.total ?? 0) / PAGE_SIZE),
  );

  let message: string | undefined;
  if (messages.isError && rows.length === 0)
    message =
      "We couldn't load the messages. Check your connection and try again.";
  else if (messages.isPending) message = "Loading messages…";
  else if (rows.length === 0)
    message =
      status === "new" && !settled
        ? "No messages are waiting for an answer."
        : "No messages match these filters.";

  return (
    <div className="mx-auto flex h-full w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <AdminPageHead
        title="Contact Us"
        subtitle="Messages from the contact form. Open one to answer it by email."
      />
      {can("contact.view") ? (
        <>
          <div className={filterBarClass}>
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.1vw,0.85rem)] lg:grid-cols-12">
              <SearchBox
                label="Search the name, email or message"
                placeholder="Search the name, email or message"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                className="col-span-2 lg:col-span-9"
              />
              <label
                className={cn(
                  filterBoxClass,
                  "relative col-span-2 lg:col-span-3",
                )}
              >
                <span className="sr-only">Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as ContactStatus | "");
                    setPage(1);
                  }}
                  className="h-full w-full cursor-pointer appearance-none rounded-[9px] bg-transparent pr-9 pl-3.5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                >
                  <option value="new">New</option>
                  <option value="replied">Replied</option>
                  <option value="">All messages</option>
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground"
                />
              </label>
            </div>
          </div>
          <div
            className={cn(
              tableCardClass,
              messages.isFetching && !messages.isPending && "opacity-80",
            )}
          >
            <div className="min-h-0 flex-[0_1_auto] overflow-auto">
              <table className="w-full min-w-[44rem] table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[41%]" />
                  <col className="w-[20%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th scope="col" className={headCell}>
                      From
                    </th>
                    <th scope="col" className={headCell}>
                      Message
                    </th>
                    <th scope="col" className={headCell}>
                      Received
                    </th>
                    <th scope="col" className={headCell}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/admin/contact/${row.id}`)}
                      className="cursor-pointer align-top hover:[&>td]:bg-muted/60"
                    >
                      <td className={cn(bodyCell, "h-auto py-2")}>
                        <Link
                          href={`/admin/contact/${row.id}`}
                          className="block truncate font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {row.name}
                        </Link>
                        <span
                          className="block truncate text-xs text-muted-foreground"
                          title={row.email}
                        >
                          {row.email}
                        </span>
                      </td>
                      <td className={cn(bodyCell, "h-auto py-2")}>
                        <p className="line-clamp-2 text-sm whitespace-pre-line text-foreground">
                          {row.message}
                        </p>
                      </td>
                      <td className={cn(bodyCell, "h-auto py-2")}>
                        {dateTimeFormat.format(new Date(row.createdAt))}
                      </td>
                      <td className={cn(bodyCell, "h-auto py-2")}>
                        <ContactStatusChip status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {message ? <TableMessage>{message}</TableMessage> : null}
            </div>
            <OrdersPagination
              page={Math.min(page, totalPages)}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your role does not include the contact messages.
        </p>
      )}
    </div>
  );
}
