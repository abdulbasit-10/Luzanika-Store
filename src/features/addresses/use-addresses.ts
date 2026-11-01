"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
  type SavedAddress,
} from "@/features/addresses/address-service";
import { useHandleSessionExpired } from "@/features/auth/use-session";
import { useAuthStore } from "@/stores/auth-store";

/** Cache key prefix for everything about saved addresses. Cleared on sign out. */
export const ADDRESSES_KEY = "addresses";

/**
 * The signed-in customer's address book, from the server. The cache key
 * includes the customer's id, so on a shared device one customer's addresses
 * are never shown to the next.
 */
export function useAddresses() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const handleSessionExpired = useHandleSessionExpired();
  const key = [ADDRESSES_KEY, userId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await listAddresses();
      } catch (error) {
        handleSessionExpired(error);
        throw error;
      }
    },
    enabled: userId !== null,
    // A failed load shows a retry button instead of retrying silently for ages.
    retry: 1,
  });

  /** Every change answers with the whole current book; show it straight away. */
  const store = (items: SavedAddress[]) => queryClient.setQueryData(key, items);

  const create = useMutation({ mutationFn: createAddress, onSuccess: store });
  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AddressInput }) =>
      updateAddress(id, values),
    onSuccess: store,
  });
  const remove = useMutation({ mutationFn: deleteAddress, onSuccess: store });
  const makeDefault = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: store,
  });

  return {
    addresses: query.data,
    isLoading: query.isPending && query.fetchStatus !== "idle",
    isError: query.isError,
    refetch: query.refetch,
    busy:
      create.isPending ||
      update.isPending ||
      remove.isPending ||
      makeDefault.isPending,
    create,
    update,
    remove,
    makeDefault,
  };
}
