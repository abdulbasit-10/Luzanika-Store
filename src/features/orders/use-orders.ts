"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toaster";
import { AuthError } from "@/features/auth/auth-service";
import { useHandleSessionExpired } from "@/features/auth/use-session";
import {
  cancelOrder,
  fetchOrder,
  fetchOrders,
  sendPaymentProof,
  simulatePayment,
} from "@/features/orders/order-service";
import type { Order } from "@/features/orders/types";
import { useAuthStore } from "@/stores/auth-store";

/** Cache key prefix for orders. Cleared on sign out. */
export const ORDERS_KEY = "orders";

const POLL_WAITING_MS = 5_000;

function explain(error: unknown, fallback: string) {
  return error instanceof AuthError && error.serverMessage
    ? error.serverMessage
    : fallback;
}

/** The signed-in customer's orders, newest first, read from the server. */
export function useOrders() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const handleSessionExpired = useHandleSessionExpired();

  const query = useQuery({
    queryKey: [ORDERS_KEY, userId],
    queryFn: async () => {
      try {
        return await fetchOrders();
      } catch (error) {
        handleSessionExpired(error);
        throw error;
      }
    },
    enabled: userId !== null,
    retry: 1,
  });

  return {
    orders: query.data,
    isLoading: userId !== null && query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * One order. While it waits for payment it is re-read every few seconds, so
 * the page changes by itself when the payment provider confirms the payment.
 */
export function useOrder(number: string | null) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const handleSessionExpired = useHandleSessionExpired();

  const query = useQuery({
    queryKey: [ORDERS_KEY, userId, number],
    queryFn: async () => {
      try {
        return await fetchOrder(number!);
      } catch (error) {
        handleSessionExpired(error);
        throw error;
      }
    },
    enabled: userId !== null && number !== null,
    retry: (count, error) =>
      count < 1 && !(error instanceof AuthError && error.code === "not_found"),
    refetchInterval: (state) =>
      state.state.data?.status === "waiting_payment" ? POLL_WAITING_MS : false,
  });

  return {
    order: query.data,
    isLoading: userId !== null && number !== null && query.isPending,
    notFound:
      query.error instanceof AuthError && query.error.code === "not_found",
    isError: query.isError,
    refetch: query.refetch,
  };
}

/** Cancel, send a payment proof and (development only) simulate-payment actions, which refresh the order lists. */
export function useOrderActions() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const handleSessionExpired = useHandleSessionExpired();

  const show = (order: Order) => {
    queryClient.setQueryData([ORDERS_KEY, userId, order.number], order);
    void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, userId] });
    // Cancelling or paying changes what the cart and product pages should show.
    void queryClient.invalidateQueries({ queryKey: ["cart"] });
  };

  const failed = (error: unknown, fallback: string) => {
    if (handleSessionExpired(error)) return;
    toast.error(explain(error, fallback), { id: "order-error" });
    void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, userId] });
  };

  const cancel = useMutation({
    mutationFn: cancelOrder,
    onSuccess: (order) => {
      show(order);
      toast.success(`Order ${order.number} was cancelled`, {
        id: "order-cancel",
      });
    },
    onError: (error) => failed(error, "Couldn't cancel the order."),
  });

  const simulate = useMutation({
    mutationFn: ({
      number,
      outcome,
    }: {
      number: string;
      outcome: "success" | "failure";
    }) => simulatePayment(number, outcome),
    onSuccess: show,
    onError: (error) => failed(error, "Couldn't simulate the payment."),
  });

  const sendProof = useMutation({
    mutationFn: ({
      number,
      ...proof
    }: {
      number: string;
      transactionId?: string;
      screenshot?: File;
    }) => sendPaymentProof(number, proof),
    onSuccess: (order) => {
      show(order);
      toast.success("Payment proof sent. We will check it and email you.", {
        id: "order-proof",
      });
    },
    onError: (error) => {
      if (handleSessionExpired(error)) return;
      // The server names what is wrong with the transaction ID or the picture.
      const fields = error instanceof AuthError ? error.fields : null;
      toast.error(
        fields?.transactionId ??
          fields?.screenshot ??
          explain(error, "Couldn't send your payment proof."),
        { id: "order-error" },
      );
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, userId] });
    },
  });

  return { cancel, simulate, sendProof };
}
