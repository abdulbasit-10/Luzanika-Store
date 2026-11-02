import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** What the add/edit form collects. */
export interface AddressInput {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  zip: string;
  isDefault: boolean;
}

export interface SavedAddress extends AddressInput {
  id: string;
}

interface AddressState {
  /** One list per signed-in user. Exactly one address in a non-empty list is the default. */
  byUser: Record<string, SavedAddress[]>;
  add: (userId: string, input: AddressInput) => void;
  update: (userId: string, id: string, input: AddressInput) => void;
  setDefault: (userId: string, id: string) => void;
  remove: (userId: string, id: string) => void;
  /** Puts a deleted address back where it was (the toast's Undo). */
  restore: (userId: string, address: SavedAddress, index: number) => void;
}

const randomId = () => Math.random().toString(36).slice(2, 12);

/** Keeps exactly one default: the given id, or the first address when none is given or found. */
function withDefault(list: SavedAddress[], defaultId?: string) {
  const id = list.some((item) => item.id === defaultId)
    ? defaultId
    : list[0]?.id;
  return list.map((item) => ({ ...item, isDefault: item.id === id }));
}

/*
 * Mock address book, kept in the browser until the backend has address
 * endpoints (GET/POST/PATCH/DELETE /addresses for the signed-in user).
 */
export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      byUser: {},

      add: (userId, input) =>
        set(({ byUser }) => {
          const list = byUser[userId] ?? [];
          const created = { ...input, id: randomId() };
          const makeDefault = input.isDefault || list.length === 0;
          return {
            byUser: {
              ...byUser,
              [userId]: withDefault(
                [...list, created],
                makeDefault ? created.id : list.find((a) => a.isDefault)?.id,
              ),
            },
          };
        }),

      update: (userId, id, input) =>
        set(({ byUser }) => {
          const list = byUser[userId] ?? [];
          // Unticking "default" on the default address leaves it as the default.
          const defaultId = input.isDefault
            ? id
            : list.find((item) => item.isDefault)?.id;
          return {
            byUser: {
              ...byUser,
              [userId]: withDefault(
                list.map((item) => (item.id === id ? { ...input, id } : item)),
                defaultId,
              ),
            },
          };
        }),

      setDefault: (userId, id) =>
        set(({ byUser }) => ({
          byUser: {
            ...byUser,
            [userId]: withDefault(byUser[userId] ?? [], id),
          },
        })),

      remove: (userId, id) =>
        set(({ byUser }) => {
          const list = byUser[userId] ?? [];
          const removed = list.find((item) => item.id === id);
          const rest = list.filter((item) => item.id !== id);
          return {
            byUser: {
              ...byUser,
              [userId]: withDefault(
                rest,
                removed?.isDefault
                  ? undefined
                  : rest.find((a) => a.isDefault)?.id,
              ),
            },
          };
        }),

      restore: (userId, address, index) =>
        set(({ byUser }) => {
          const list = byUser[userId] ?? [];
          if (list.some((item) => item.id === address.id)) return {};
          const next = [...list];
          next.splice(Math.min(index, next.length), 0, address);
          return {
            byUser: {
              ...byUser,
              [userId]: withDefault(
                next,
                address.isDefault
                  ? address.id
                  : list.find((a) => a.isDefault)?.id,
              ),
            },
          };
        }),
    }),
    {
      name: "luzanika-addresses",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ byUser }) => ({ byUser }),
    },
  ),
);
