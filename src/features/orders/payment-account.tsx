import type { PaymentOption } from "@/features/orders/payment-methods";

/** Where to send a transfer: the bank account, or the Easypaisa / JazzCash number. Renders nothing for cash and cards. */
export function PaymentAccount({ option }: { option: PaymentOption }) {
  if (!("details" in option)) return null;

  const rows: [string, string][] =
    option.method === "bank_transfer"
      ? [
          ["Bank", option.details.bankName],
          ["Account title", option.details.accountTitle],
          ["Account number / IBAN", option.details.accountNumber],
        ]
      : [
          ["Account title", option.details.accountTitle],
          [
            option.method === "easypaisa"
              ? "Easypaisa number"
              : "JazzCash number",
            option.details.number,
          ],
        ];

  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-white p-2.5 text-left text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-semibold break-all select-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
