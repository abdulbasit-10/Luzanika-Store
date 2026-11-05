"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { fieldControlClass } from "@/components/ui/field";
import type { Order } from "@/features/orders/types";
import { useOrderActions } from "@/features/orders/use-orders";

/** Same limit as the server: a bigger picture is refused there, so say so before uploading it. */
const MAX_SCREENSHOT_BYTES = 6 * 1024 * 1024;

/**
 * "I paid": the transaction ID the bank or wallet app shows and/or a
 * screenshot of the payment. Staff then check it. A rejected proof is replaced
 * by sending a new one here.
 */
export function PaymentProofForm({ order }: { order: Order }) {
  const { sendProof } = useOrderActions();
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const id = transactionId.trim();
    if (!id && !screenshot) {
      setProblem(
        "Enter the transaction ID or add a screenshot of the payment.",
      );
      return;
    }
    if (screenshot && screenshot.size > MAX_SCREENSHOT_BYTES) {
      setProblem("That picture is too large. Please choose one under 6 MB.");
      return;
    }
    setProblem(null);
    sendProof.mutate(
      {
        number: order.number,
        transactionId: id || undefined,
        screenshot: screenshot ?? undefined,
      },
      {
        onSuccess: () => {
          setTransactionId("");
          setScreenshot(null);
          if (fileInput.current) fileInput.current.value = "";
        },
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-2">
      <p className="font-medium">
        {order.paymentProof?.status === "rejected"
          ? "Send your payment proof again"
          : "Already paid? Send your payment proof"}
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Transaction ID (TID)</span>
        <input
          type="text"
          value={transactionId}
          onChange={(event) => setTransactionId(event.target.value)}
          maxLength={60}
          autoComplete="off"
          className={fieldControlClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">
          Screenshot of the payment (JPG, PNG or WebP, up to 6 MB)
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)}
          className="text-xs file:mr-3 file:rounded-md file:border file:border-foreground file:bg-white file:px-3 file:py-1.5 file:text-xs"
        />
      </label>
      {problem ? (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={sendProof.isPending}
        className="self-start"
      >
        {sendProof.isPending ? "Sending…" : "Send payment proof"}
      </Button>
    </form>
  );
}
