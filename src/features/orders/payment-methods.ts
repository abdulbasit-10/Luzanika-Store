/** Every way an order can be paid. The server decides which ones a shopper is offered. */
export const PAYMENT_METHODS = [
  "cod",
  "bank_transfer",
  "easypaisa",
  "jazzcash",
  "card",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Paid outside the shop: the customer sends money, then sends the transaction ID or a screenshot. */
export type TransferMethod = "bank_transfer" | "easypaisa" | "jazzcash";

export const isTransferMethod = (
  method: PaymentMethod,
): method is TransferMethod =>
  method === "bank_transfer" || method === "easypaisa" || method === "jazzcash";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
  card: "Credit or debit card",
};

/** Where to send the money, as the server describes it. */
export interface BankDetails {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
}
export interface WalletDetails {
  accountTitle: string;
  number: string;
}

export type PaymentOption =
  | { method: "card" | "cod" }
  | { method: "bank_transfer"; details: BankDetails }
  | { method: "easypaisa" | "jazzcash"; details: WalletDetails };

/** GET /payment-methods?market=: how a shopper of the market can pay. */
export interface PaymentOptions {
  market: "PK" | "DE";
  /** How long an order waits for a transfer before its items go back on sale. */
  holdHours?: number;
  methods: PaymentOption[];
}
