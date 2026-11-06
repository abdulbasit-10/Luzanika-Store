"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { REGIONS } from "@/config/regions";
import { AuthError } from "@/features/auth/auth-service";
import { useHandleSessionExpired } from "@/features/auth/use-session";
import type { CartLine } from "@/features/cart/cart-service";
import type { CartTotals } from "@/features/cart/cart-totals";
import { OrderSummary } from "@/features/cart/order-summary";
import {
  checkoutSchema,
  type CheckoutFormValues,
} from "@/features/checkout/checkout-schema";
import { ContactCard } from "@/features/checkout/contact-card";
import { PaymentCard } from "@/features/checkout/payment-card";
import { ShippingCard } from "@/features/checkout/shipping-card";
import {
  placeOrder,
  type PlaceOrderInput,
} from "@/features/orders/order-service";
import type { Order } from "@/features/orders/types";
import { useAuthStore } from "@/stores/auth-store";
import type { RegionCode } from "@/types/region";

const FORM_ID = "checkout-form";

function toOrderInput(
  values: CheckoutFormValues,
  lines: CartLine[],
  totals: CartTotals,
  region: RegionCode,
): PlaceOrderInput {
  return {
    market: region,
    contact: { email: values.email, phone: values.phone },
    shipping: {
      fullName: values.fullName,
      company: values.company || undefined,
      country: values.country,
      city: values.city,
      address: values.address,
      zip: values.zip,
    },
    billing: values.sameBilling
      ? "same"
      : {
          country: values.billingCountry,
          city: values.billingCity,
          address: values.billingAddress,
          zip: values.billingZip,
        },
    paymentMethod: values.paymentMethod,
    acceptTerms: true,
    // No prices and no card details: the server prices the order itself and
    // only checks that it matches what the shopper saw.
    expected: {
      total: totals.total,
      items: lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
      })),
    },
  };
}

/** Plain words for the shopper for each way placing the order can be refused. */
function describeFailure(error: unknown): string {
  if (error instanceof AuthError) {
    if (error.code === "cart_changed") {
      return "Your cart changed while you were checking out (a price or the stock). We updated it. Please check the total and place the order again.";
    }
    if (error.serverMessage) return error.serverMessage;
  }
  return "Something went wrong. Please try again.";
}

/**
 * The forms and the order summary. They sit together so "Place Order" (in the
 * summary, outside the <form>) can follow the chosen payment method.
 */
export function CheckoutContent({
  lines,
  totals,
  region,
  onPlaced,
}: {
  /** The selected cart lines. */
  lines: CartLine[];
  totals: CartTotals;
  region: RegionCode;
  onPlaced: (order: Order) => void;
}) {
  const queryClient = useQueryClient();
  const handleSessionExpired = useHandleSessionExpired();
  const user = useAuthStore((state) => state.user);
  const regionCountry = REGIONS[region].name;

  const methods = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      company: "",
      country: regionCountry,
      city: "",
      address: "",
      zip: "",
      // Pakistan starts on cash on delivery, Germany on cards; the payment card corrects it if the server offers something else.
      paymentMethod: region === "PK" ? "cod" : "card",
      sameBilling: true,
      billingCountry: regionCountry,
      billingCity: "",
      billingAddress: "",
      billingZip: "",
      acceptTerms: false,
    },
  });
  const { handleSubmit, setValue } = methods;

  // The country follows the region selector until the shopper edits it.
  const countryEdited = useRef(false);
  useEffect(() => {
    if (!countryEdited.current) setValue("country", regionCountry);
  }, [regionCountry, setValue]);

  // One key per checkout attempt: a double click or a retry after a bad
  // connection returns the same order instead of making a second one.
  const attemptKey = useRef(crypto.randomUUID());

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: (input: PlaceOrderInput) =>
      placeOrder(input, attemptKey.current),
    onSuccess: ({ order }) => {
      // The order took its lines out of the cart, and held their stock.
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      onPlaced(order);
    },
    onError: (failure) => {
      if (handleSessionExpired(failure)) return;
      // The cart on screen is out of date, and the refused attempt is over.
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      if (failure instanceof AuthError && failure.code === "cart_changed") {
        attemptKey.current = crypto.randomUUID();
      }
    },
  });

  const canPay = !isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
      <FormProvider {...methods}>
        <form
          id={FORM_ID}
          noValidate
          onSubmit={handleSubmit((values) => {
            reset();
            mutate(toOrderInput(values, lines, totals, region));
          })}
          className="flex flex-col gap-2.5"
        >
          <ContactCard />
          <ShippingCard
            onCountryEdited={() => {
              countryEdited.current = true;
            }}
          />
          <PaymentCard region={region} />
        </form>
      </FormProvider>

      <OrderSummary totals={totals} region={region}>
        <Button
          type="submit"
          form={FORM_ID}
          disabled={!canPay}
          className="h-11 w-full rounded-lg px-4 py-0 text-[15px]"
        >
          {isPending ? "Placing your order…" : "Place Order"}
        </Button>
        {error ? (
          <p role="alert" className="mt-3 text-center text-xs text-danger">
            {describeFailure(error)}
          </p>
        ) : null}
      </OrderSummary>
    </div>
  );
}
