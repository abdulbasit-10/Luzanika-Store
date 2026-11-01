"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Radio } from "@/components/ui/radio";
import { toast } from "@/components/ui/toaster";
import { AddressDialog } from "@/features/addresses/address-dialog";
import type { AddressFormValues } from "@/features/addresses/address-schema";
import type { SavedAddress } from "@/features/addresses/address-service";
import { useAddresses } from "@/features/addresses/use-addresses";
import { AuthError } from "@/features/auth/auth-service";
import { useHandleSessionExpired } from "@/features/auth/use-session";

const NO_ADDRESSES: SavedAddress[] = [];

function matches(address: SavedAddress, query: string) {
  const text = [
    address.fullName,
    address.phone,
    address.country,
    address.city,
    address.address,
    address.zip,
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

const actionClass =
  "text-[11px] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

function ListSkeleton() {
  return (
    <div
      role="status"
      className="mt-4 animate-pulse space-y-3 rounded-2xl bg-white p-5"
    >
      {[0, 1].map((row) => (
        <div key={row} className="h-20 rounded-lg bg-black/[0.04]" />
      ))}
      <span className="sr-only">Loading your addresses…</span>
    </div>
  );
}

/** Message for a failed change: what the server said when it is something the customer can act on, otherwise a general one. */
function failureMessage(failure: unknown, fallback: string) {
  if (failure instanceof AuthError) {
    if (failure.code === "rate_limited") {
      return "Too many changes. Please wait a moment and try again.";
    }
    if (failure.code === "unprocessable" && failure.serverMessage) {
      return failure.serverMessage;
    }
    if (failure.code === "not_found") {
      return "That address no longer exists. The list has been refreshed.";
    }
  }
  return fallback;
}

/** The signed-in customer's saved delivery addresses: search, add, edit, delete and pick the default. Saved on the server. */
export function AddressesView() {
  const {
    addresses: loaded,
    isLoading,
    isError,
    refetch,
    busy,
    create,
    update,
    remove,
    makeDefault,
  } = useAddresses();
  const handleSessionExpired = useHandleSessionExpired();

  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{
    open: boolean;
    address: SavedAddress | null;
  }>({ open: false, address: null });

  const addresses = loaded ?? NO_ADDRESSES;
  const shown = query.trim()
    ? addresses.filter((address) => matches(address, query))
    : addresses;

  const openDialog = (address: SavedAddress | null) =>
    setDialog({ open: true, address });
  const closeDialog = () => setDialog((state) => ({ ...state, open: false }));

  /** Common handling for a failed change. Returns true when the caller should stop (session ended). */
  function handleFailure(failure: unknown, fallback: string) {
    if (handleSessionExpired(failure)) return;
    if (failure instanceof AuthError && failure.code === "not_found")
      void refetch();
    toast.error(failureMessage(failure, fallback));
  }

  /** Throws (so the dialog can show the messages) when the server found a problem with a field. */
  async function save(values: AddressFormValues) {
    try {
      if (dialog.address) {
        await update.mutateAsync({ id: dialog.address.id, values });
        toast.success("Address updated");
      } else {
        await create.mutateAsync(values);
        toast.success("Address saved");
      }
      closeDialog();
    } catch (failure) {
      if (failure instanceof AuthError && failure.fields) throw failure;
      handleFailure(failure, "Couldn't save the address. Please try again.");
    }
  }

  function deleteAddress(address: SavedAddress) {
    remove.mutate(address.id, {
      onSuccess: () => {
        toast(`Address for ${address.fullName} deleted`, {
          id: `address-${address.id}`,
          action: {
            label: "Undo",
            // Saved again as a new address (it goes to the end of the list).
            onClick: () => {
              const { id, ...values } = address;
              void id;
              create.mutate(values, {
                onError: (failure) =>
                  handleFailure(failure, "Couldn't restore the address."),
              });
            },
          },
        });
      },
      onError: (failure) =>
        handleFailure(
          failure,
          "Couldn't delete the address. Please try again.",
        ),
    });
  }

  function chooseDefault(address: SavedAddress) {
    if (address.isDefault) return;
    makeDefault.mutate(address.id, {
      onSuccess: () =>
        toast.success("Default address updated", { id: "default-address" }),
      onError: (failure) =>
        handleFailure(
          failure,
          "Couldn't change the default. Please try again.",
        ),
    });
  }

  return (
    <div className="mx-auto w-full max-w-[980px] lg:mx-0">
      <h1 className="sr-only">Saved addresses</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-[280px]">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            aria-label="Search address"
            placeholder="Search address"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-[clamp(2rem,5.2dvh,2.5rem)] w-full rounded-md border border-black/10 bg-white pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <Button
          onClick={() => openDialog(null)}
          disabled={isLoading || isError}
          className="h-[clamp(2rem,5.2dvh,2.5rem)] rounded-md px-4 py-0 text-sm font-medium"
        >
          <Plus aria-hidden className="size-4" />
          Add new address
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <EmptyState
          className="mt-4 rounded-2xl bg-white"
          title="We couldn't load your addresses"
          description="Please check your connection and try again."
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      ) : addresses.length === 0 ? (
        <EmptyState
          className="mt-4 rounded-2xl bg-white"
          title="No saved addresses"
          description="Add a delivery address to keep it handy for your next order."
          action={
            <Button onClick={() => openDialog(null)}>Add new address</Button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState
          className="mt-4 rounded-2xl bg-white"
          title="No addresses match your search"
          description="Try a different name, city or street."
        />
      ) : (
        <fieldset className="mt-[clamp(0.75rem,2.4dvh,1rem)] rounded-2xl bg-white px-4 sm:px-5">
          <legend className="sr-only">Choose your default address</legend>
          <ul className="divide-y divide-black/10">
            {shown.map((address) => (
              <li
                key={address.id}
                className="flex items-start justify-between gap-4 py-[clamp(0.75rem,2.2dvh,1.1rem)]"
              >
                <div className="min-w-0 text-xs leading-5 text-muted-foreground">
                  <h2 className="text-[13px] font-semibold text-foreground">
                    {address.fullName}
                  </h2>
                  <p>{address.phone}</p>
                  <p>
                    {address.city}, {address.country}
                  </p>
                  <p className="text-foreground">
                    {address.address}, {address.zip}
                  </p>
                  <div className="mt-1 flex gap-4">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openDialog(address)}
                      aria-label={`Edit address for ${address.fullName}`}
                      className={`${actionClass} text-blue-600`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteAddress(address)}
                      aria-label={`Delete address for ${address.fullName}`}
                      className={`${actionClass} text-danger`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <Radio
                  name="default-address"
                  checked={address.isDefault}
                  disabled={busy}
                  onChange={() => chooseDefault(address)}
                  label={
                    <span className="sr-only">
                      Use the address for {address.fullName} as default
                    </span>
                  }
                  className="mt-1"
                />
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <AddressDialog
        open={dialog.open}
        address={dialog.address}
        first={addresses.length === 0}
        onClose={closeDialog}
        onSave={save}
      />
    </div>
  );
}
