"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Radio } from "@/components/ui/radio";
import { toast } from "@/components/ui/toaster";
import { AddressDialog } from "@/features/addresses/address-dialog";
import type { AddressFormValues } from "@/features/addresses/address-schema";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAuthStore } from "@/stores/auth-store";
import { useAddressStore, type SavedAddress } from "@/stores/address-store";

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
  "text-[11px] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** The signed-in user's saved delivery addresses: search, add, edit, delete and pick the default. */
export function AddressesView() {
  const hydrated = useHydrated();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const saved = useAddressStore((state) =>
    userId ? state.byUser[userId] : undefined,
  );
  const { add, update, remove, restore, setDefault } = useAddressStore();

  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{
    open: boolean;
    address: SavedAddress | null;
  }>({ open: false, address: null });

  const addresses = hydrated && saved ? saved : NO_ADDRESSES;
  const shown = query.trim()
    ? addresses.filter((address) => matches(address, query))
    : addresses;

  const openDialog = (address: SavedAddress | null) =>
    setDialog({ open: true, address });
  const closeDialog = () => setDialog((state) => ({ ...state, open: false }));

  function save(values: AddressFormValues) {
    if (!userId) return;
    if (dialog.address) {
      update(userId, dialog.address.id, values);
      toast.success("Address updated");
    } else {
      add(userId, values);
      toast.success("Address saved");
    }
    closeDialog();
  }

  function deleteAddress(address: SavedAddress) {
    if (!userId) return;
    const index = addresses.findIndex((item) => item.id === address.id);
    remove(userId, address.id);
    toast(`Address for ${address.fullName} deleted`, {
      id: `address-${address.id}`,
      action: {
        label: "Undo",
        onClick: () => restore(userId, address, index),
      },
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
          className="h-[clamp(2rem,5.2dvh,2.5rem)] rounded-md px-4 py-0 text-sm font-medium"
        >
          <Plus aria-hidden className="size-4" />
          Add new address
        </Button>
      </div>

      {addresses.length === 0 ? (
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
                      onClick={() => openDialog(address)}
                      aria-label={`Edit address for ${address.fullName}`}
                      className={`${actionClass} text-blue-600`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
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
                  onChange={() => {
                    if (!userId || address.isDefault) return;
                    setDefault(userId, address.id);
                    toast.success("Default address updated", {
                      id: "default-address",
                    });
                  }}
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
