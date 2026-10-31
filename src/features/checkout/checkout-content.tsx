"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { REGIONS } from "@/config/regions";
import type { CartTotals } from "@/features/cart/cart-totals";
import { OrderSummary } from "@/features/cart/order-summary";
import {
  checkoutSchema,
  type CheckoutFormValues,
} from "@/features/checkout/checkout-schema";
import {
  placeOrder,
  type PlaceOrderInput,
} from "@/features/checkout/checkout-service";
import { ContactCard } from "@/features/checkout/contact-card";
import { PaymentCard } from "@/features/checkout/payment-card";
import { ShippingCard } from "@/features/checkout/shipping-card";
import { useCartStore, type CartLine } from "@/stores/cart-store";
import type { RegionCode } from "@/types/region";
import { useEffect } from "react";

export interface PlacedOrderSummary {
  orderNumber: string;
  email: string;
  itemCount: number;
  total: number;
  region: RegionCode;
}

const FORM_ID = "checkout-form";

function toOrderInput(
  values: CheckoutFormValues,
  lines: CartLine[],
): PlaceOrderInput {
  return {
    contact: { email: values.email, phone: values.phone },
    shipping: {
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
    // Card details are deliberately left out (see checkout-service).
    items: lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      size: line.size,
      color: line.color,
    })),
  };
}

/**
 * The forms and the order summary. They sit together so "Pay Now" (in the
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
  onPlaced: (order: PlacedOrderSummary) => void;
}) {
  const removeSelected = useCartStore((state) => state.removeSelected);
  const regionCountry = REGIONS[region].name;

  const methods = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: "",
      phone: "",
      company: "",
      country: regionCountry,
      city: "",
      address: "",
      zip: "",
      paymentMethod: "card",
      cardName: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      sameBilling: true,
      billingCountry: regionCountry,
      billingCity: "",
      billingAddress: "",
      billingZip: "",
      acceptTerms: false,
    },
  });
  const { handleSubmit, setValue, control } = methods;

  // The country follows the region selector until the shopper edits it.
  const countryEdited = useRef(false);
  useEffect(() => {
    if (!countryEdited.current) setValue("country", regionCountry);
  }, [regionCountry, setValue]);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: placeOrder,
    onSuccess: ({ orderNumber }, input) => {
      onPlaced({
        orderNumber,
        email: input.contact.email,
        itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
        total: totals.total,
        region,
      });
      removeSelected();
    },
  });

  const method = useWatch({ control, name: "paymentMethod" });
  const canPay = method === "card" && !isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
      <FormProvider {...methods}>
        <form
          id={FORM_ID}
          noValidate
          onSubmit={handleSubmit((values) =>
            mutate(toOrderInput(values, lines)),
          )}
          className="flex flex-col gap-2.5"
        >
          <ContactCard />
          <ShippingCard
            onCountryEdited={() => {
              countryEdited.current = true;
            }}
          />
          <PaymentCard />
        </form>
      </FormProvider>

      <OrderSummary totals={totals} region={region}>
        <Button
          type="submit"
          form={FORM_ID}
          disabled={!canPay}
          className="h-11 w-full rounded-lg px-4 py-0 text-[15px]"
        >
          {isPending ? "Processing…" : "Pay Now"}
        </Button>
        {isError ? (
          <p role="alert" className="mt-3 text-center text-xs text-danger">
            Something went wrong. Please try again.
          </p>
        ) : null}
        {method === "card" ? null : (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Choose credit card to pay.
          </p>
        )}
      </OrderSummary>
    </div>
  );
}
