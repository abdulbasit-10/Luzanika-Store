"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { RegionFlag } from "@/components/shared/region-flag";
import { OrdersPagination } from "@/features/admin-orders/orders-table";
import { dateTimeFormat } from "@/features/admin-orders/order-detail-ui";
import { useAdminMarket } from "@/features/admin-shell/admin-market";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import {
  Field,
  FormError,
  SearchBox,
  TableMessage,
  bodyCell,
  filterBarClass,
  filterBoxClass,
  headCell,
  inputClass,
  secondaryButton,
  tableCardClass,
  useDebounced,
} from "@/features/admin-shell/admin-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/cn";

import {
  adjustStock,
  fetchMovements,
  fetchStock,
  setLowStockThreshold,
  type Movement,
  type MovementReason,
  type StockRow,
} from "./admin-stock-service";
import {
  adjustProblems,
  parseUnits,
  resultingOnHand,
  toStockChange,
  type AdjustMode,
  type AdjustValues,
} from "./stock-forms";

const PAGE_SIZE = 10;

const REASON_LABEL: Record<MovementReason, string> = {
  initial_import: "Starting stock",
  adjustment: "Adjustment",
  sale: "Sale",
  return: "Return",
  correction: "Correction",
};

const MODES: { value: AdjustMode; label: string }[] = [
  { value: "add", label: "Add units" },
  { value: "remove", label: "Remove units" },
  { value: "set", label: "Set exact number" },
];

const variantLine = (row: Pick<StockRow, "sku" | "color" | "size">) =>
  [row.color, row.size].filter(Boolean).join(" · ");

/** Change how many are on the shelf, with a reason that goes to the history. */
function AdjustDialog({
  row,
  onClose,
}: {
  row: StockRow;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<AdjustValues>({
    mode: "add",
    quantity: "",
    reason: "adjustment",
    note: "",
  });
  const [shown, setShown] = useState(false);
  const problems = adjustProblems(values);
  const after = resultingOnHand(row.onHand, values);

  const save = useMutation({
    mutationFn: () => {
      const change = toStockChange(values);
      if (!change) throw new Error("Enter a whole number");
      return adjustStock(row, change, values.reason, values.note);
    },
    onSuccess: async () => {
      toast.success("Stock updated");
      onClose();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "stock"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "product"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
  });

  const set = (patch: Partial<AdjustValues>) =>
    setValues((current) => ({ ...current, ...patch }));

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (Object.keys(problems).length === 0) save.mutate();
      }}
      title="Change stock"
      description={`${row.productName} · ${row.sku} · ${row.market === "PK" ? "Pakistan" : "Germany"}. On the shelf now: ${row.onHand}, held for unpaid orders: ${row.reserved}.`}
      confirmLabel="Save stock"
      pendingLabel="Saving…"
      pending={save.isPending}
    >
      <div className="flex flex-col gap-3">
        <Field id="adj-mode" label="What happened">
          <select
            id="adj-mode"
            value={values.mode}
            onChange={(e) => set({ mode: e.target.value as AdjustMode })}
            className={inputClass}
          >
            {MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="adj-qty"
          label={
            values.mode === "set" ? "Units on the shelf" : "Number of units"
          }
          error={shown ? problems.quantity : undefined}
          hint={after !== null ? `The shelf will hold ${after}.` : undefined}
        >
          <input
            id="adj-qty"
            inputMode="numeric"
            value={values.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
            aria-invalid={shown && Boolean(problems.quantity)}
            aria-describedby="adj-qty-error"
            className={inputClass}
          />
        </Field>
        <Field id="adj-reason" label="Reason">
          <select
            id="adj-reason"
            value={values.reason}
            onChange={(e) =>
              set({ reason: e.target.value as AdjustValues["reason"] })
            }
            className={inputClass}
          >
            <option value="adjustment">New delivery or normal change</option>
            <option value="correction">Fixing a counting mistake</option>
          </select>
        </Field>
        <Field
          id="adj-note"
          label={
            values.reason === "correction"
              ? "What was wrong"
              : "Note (optional)"
          }
          error={shown ? problems.note : undefined}
        >
          <input
            id="adj-note"
            value={values.note}
            onChange={(e) => set({ note: e.target.value })}
            maxLength={200}
            aria-invalid={shown && Boolean(problems.note)}
            aria-describedby="adj-note-error"
            className={inputClass}
          />
        </Field>
        <FormError error={save.error} />
      </div>
    </ConfirmDialog>
  );
}

/** The number at which this variant counts as "low". */
function ThresholdDialog({
  row,
  onClose,
}: {
  row: StockRow;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(String(row.lowStockThreshold));
  const [shown, setShown] = useState(false);
  const value = parseUnits(text);

  const save = useMutation({
    mutationFn: () => setLowStockThreshold(row, value ?? 0),
    onSuccess: async () => {
      toast.success("Low-stock alert saved");
      onClose();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "stock"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
  });

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (value !== null && value <= 100_000) save.mutate();
      }}
      title="Low-stock alert"
      description={`${row.productName} · ${row.sku}. It shows as low on the dashboard when this many or fewer can be sold.`}
      confirmLabel="Save"
      pendingLabel="Saving…"
      pending={save.isPending}
    >
      <Field
        id="thr"
        label="Alert at or below"
        error={
          shown && (value === null || value > 100_000)
            ? "Enter a whole number"
            : undefined
        }
      >
        <input
          id="thr"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="thr-error"
          className={inputClass}
        />
      </Field>
      <FormError error={save.error} />
    </ConfirmDialog>
  );
}

function StockTable({ canAdjust }: { canAdjust: boolean }) {
  const { market } = useAdminMarket();
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [threshold, setThreshold] = useState<StockRow | null>(null);
  const settled = useDebounced(search);

  const filters = {
    market: market === "all" ? undefined : market,
    search: settled || undefined,
    lowOnly,
  };
  const stock = useQuery({
    queryKey: ["admin", "stock", "levels", filters, page],
    queryFn: () => fetchStock(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
  const rows = stock.data?.items ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((stock.data?.total ?? 0) / PAGE_SIZE),
  );

  let message: string | undefined;
  if (stock.isError && rows.length === 0)
    message =
      "We couldn't load the stock. Check your connection and try again.";
  else if (stock.isPending) message = "Loading stock…";
  else if (rows.length === 0) message = "Nothing matches these filters.";

  return (
    <>
      <div className={filterBarClass}>
        <div className="flex flex-wrap items-center gap-[clamp(0.5rem,1.1vw,0.85rem)]">
          <SearchBox
            label="Search by product or SKU"
            placeholder="Search by product or SKU"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            className="min-w-[14rem] flex-1"
          />
          <div className={cn(filterBoxClass, "px-3.5")}>
            <Checkbox
              label="Low stock only"
              checked={lowOnly}
              onChange={(event) => {
                setLowOnly(event.target.checked);
                setPage(1);
              }}
              className="items-center text-foreground"
            />
          </div>
        </div>
      </div>
      <div
        className={cn(
          tableCardClass,
          stock.isFetching && !stock.isPending && "opacity-80",
        )}
      >
        <div className="min-h-0 flex-[0_1_auto] overflow-auto">
          <table className="w-full min-w-[48rem] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr>
                <th scope="col" className={headCell}>
                  Product
                </th>
                <th scope="col" className={headCell}>
                  Market
                </th>
                <th scope="col" className={headCell}>
                  On shelf
                </th>
                <th scope="col" className={headCell}>
                  Held
                </th>
                <th scope="col" className={headCell}>
                  Can sell
                </th>
                <th scope="col" className={headCell}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.variantId}-${row.market}`}>
                  <td className={bodyCell}>
                    <span className="block truncate font-medium text-foreground">
                      {row.productName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.sku}
                      {variantLine(row) ? ` · ${variantLine(row)}` : ""}
                      {row.variantActive ? "" : " · off sale"}
                    </span>
                  </td>
                  <td className={cn(bodyCell, "text-foreground")}>
                    <span className="flex items-center gap-2">
                      <RegionFlag region={row.market} />
                      {row.market}
                    </span>
                  </td>
                  <td className={cn(bodyCell, "text-foreground")}>
                    {row.onHand}
                  </td>
                  <td className={cn(bodyCell, "text-foreground")}>
                    {row.reserved}
                  </td>
                  <td className={bodyCell}>
                    <span
                      className={cn(
                        "font-semibold",
                        row.available <= 0
                          ? "text-danger"
                          : row.low
                            ? "text-[#ff9f24]"
                            : "text-foreground",
                      )}
                    >
                      {row.available}
                    </span>
                    {row.low ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        low
                      </span>
                    ) : null}
                  </td>
                  <td className={bodyCell}>
                    {canAdjust ? (
                      <span className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAdjusting(row)}
                          className={cn(secondaryButton, "px-3 py-1")}
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => setThreshold(row)}
                          title={`Low-stock alert at ${row.lowStockThreshold}`}
                          className={cn(secondaryButton, "px-3 py-1")}
                        >
                          Alert
                        </button>
                      </span>
                    ) : null}
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
      {adjusting ? (
        <AdjustDialog row={adjusting} onClose={() => setAdjusting(null)} />
      ) : null}
      {threshold ? (
        <ThresholdDialog row={threshold} onClose={() => setThreshold(null)} />
      ) : null}
    </>
  );
}

function HistoryTable() {
  const { market } = useAdminMarket();
  const [reason, setReason] = useState<MovementReason | "">("");
  const [page, setPage] = useState(1);
  const filters = {
    market: market === "all" ? undefined : market,
    reason: reason || undefined,
  };
  const movements = useQuery({
    queryKey: ["admin", "stock", "movements", filters, page],
    queryFn: () => fetchMovements(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
  const rows: Movement[] = movements.data?.items ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((movements.data?.total ?? 0) / PAGE_SIZE),
  );

  let message: string | undefined;
  if (movements.isError && rows.length === 0)
    message =
      "We couldn't load the history. Check your connection and try again.";
  else if (movements.isPending) message = "Loading history…";
  else if (rows.length === 0) message = "No stock changes yet.";

  return (
    <>
      <div className={filterBarClass}>
        <label className={cn(filterBoxClass, "w-full max-w-xs px-1")}>
          <span className="sr-only">Reason</span>
          <select
            value={reason}
            onChange={(event) => {
              setReason(event.target.value as MovementReason | "");
              setPage(1);
            }}
            className="h-full w-full cursor-pointer rounded-[9px] bg-transparent px-2.5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <option value="">All changes</option>
            {Object.entries(REASON_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={tableCardClass}>
        <div className="min-h-0 flex-[0_1_auto] overflow-auto">
          <table className="w-full min-w-[48rem] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[28%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[34%]" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr>
                <th scope="col" className={headCell}>
                  When
                </th>
                <th scope="col" className={headCell}>
                  Product
                </th>
                <th scope="col" className={headCell}>
                  Market
                </th>
                <th scope="col" className={headCell}>
                  Change
                </th>
                <th scope="col" className={headCell}>
                  Why and who
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={cn(bodyCell, "text-xs text-foreground")}>
                    {dateTimeFormat.format(new Date(row.createdAt))}
                  </td>
                  <td className={bodyCell}>
                    <span className="block truncate font-medium text-foreground">
                      {row.productName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.sku}
                    </span>
                  </td>
                  <td className={cn(bodyCell, "text-foreground")}>
                    {row.market}
                  </td>
                  <td
                    className={cn(
                      bodyCell,
                      "font-semibold",
                      row.delta < 0 ? "text-danger" : "text-success",
                    )}
                  >
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </td>
                  <td className={cn(bodyCell, "text-foreground")}>
                    <span className="block truncate">
                      {REASON_LABEL[row.reason] ?? row.reason}
                      {row.orderNumber ? ` · ${row.orderNumber}` : ""}
                      {row.note ? ` · “${row.note}”` : ""}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.by ? row.by.name : "System"}
                    </span>
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
  );
}

/** Inventory: what is on the shelf in each market, and every change to it. */
export function AdminStockView() {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);
  const [tab, setTab] = useState<"levels" | "history">("levels");

  const tabClass = (active: boolean) =>
    cn(
      "rounded-lg px-4 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      active
        ? "bg-foreground text-white"
        : "border border-border bg-white text-foreground hover:bg-muted",
    );

  return (
    <div className="mx-auto flex h-full w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AdminPageHead
          title="Inventory"
          subtitle="What is on the shelf in each market, and every change to it."
        />
        {can("stock.view") ? (
          <div
            role="tablist"
            aria-label="Inventory view"
            className="flex gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "levels"}
              onClick={() => setTab("levels")}
              className={tabClass(tab === "levels")}
            >
              Stock levels
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "history"}
              onClick={() => setTab("history")}
              className={tabClass(tab === "history")}
            >
              History
            </button>
          </div>
        ) : null}
      </div>
      {can("stock.view") ? (
        tab === "levels" ? (
          <StockTable canAdjust={can("stock.adjust")} />
        ) : (
          <HistoryTable />
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Your role does not include stock.
        </p>
      )}
    </div>
  );
}
