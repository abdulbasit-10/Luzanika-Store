import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const checkoutClass = buttonStyles({
  className: "h-11 w-full rounded-lg px-4 py-0 text-[15px]",
});

/** Checkout button under the cart total. Disabled until at least one item is selected. */
export function CheckoutAction({ canCheckout }: { canCheckout: boolean }) {
  return (
    <>
      {canCheckout ? (
        <Link href="/checkout" className={checkoutClass}>
          Checkout
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={cn(checkoutClass, "cursor-not-allowed")}
        >
          Checkout
        </button>
      )}
      {canCheckout ? null : (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Select at least one item to check out.
        </p>
      )}
    </>
  );
}
