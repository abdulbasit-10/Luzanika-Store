"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toaster";

import type { Product } from "./admin-products-service";

/**
 * Runs one change to a product. Every product call answers with the whole
 * updated product, so the page shows it at once; the list and the stock
 * screen are marked old so they load again when opened.
 */
export function useProductMutation<Variables>(
  id: string,
  run: (variables: Variables) => Promise<Product>,
  successMessage: string,
  onDone?: (product: Product) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async (product) => {
      toast.success(successMessage);
      queryClient.setQueryData(["admin", "product", id], product);
      onDone?.(product);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "stock"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
  });
}
