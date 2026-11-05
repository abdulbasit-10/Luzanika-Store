import { parseMajorToMinor } from "@/features/admin-shell/admin-money";

import type { BankAccount, WalletAccount } from "./admin-settings-service";

/** The same rules the server enforces, so people hear what is wrong before the server says no. */

export type Problems<T> = Partial<Record<keyof T, string>>;

const ACCOUNT_NUMBER = /^[A-Za-z0-9][A-Za-z0-9\s-]{2,39}$/;
const WALLET_NUMBER = /^\+?[\d\s()-]{6,20}$/;

function required(
  problems: Record<string, string>,
  key: string,
  value: string,
  label: string,
  max: number,
) {
  const text = value.trim();
  if (!text) problems[key] = `Enter the ${label}`;
  else if (text.length > max) problems[key] = `Keep it under ${max} characters`;
}

export function bankProblems(values: BankAccount): Problems<BankAccount> {
  const problems: Record<string, string> = {};
  required(problems, "bankName", values.bankName, "bank name", 80);
  required(problems, "accountTitle", values.accountTitle, "account title", 80);
  if (!ACCOUNT_NUMBER.test(values.accountNumber.trim())) {
    problems.accountNumber =
      "Enter the account number or IBAN (letters, digits, spaces)";
  }
  return problems;
}

export function walletProblems(values: WalletAccount): Problems<WalletAccount> {
  const problems: Record<string, string> = {};
  required(problems, "accountTitle", values.accountTitle, "account title", 80);
  if (!WALLET_NUMBER.test(values.number.trim())) {
    problems.number = "Enter a valid number, like 0300 1234567";
  }
  return problems;
}

/** What is sent: the details with their spaces at the ends trimmed. */
export const cleanBank = (values: BankAccount): BankAccount => ({
  bankName: values.bankName.trim(),
  accountTitle: values.accountTitle.trim(),
  accountNumber: values.accountNumber.trim(),
});

export const cleanWallet = (values: WalletAccount): WalletAccount => ({
  accountTitle: values.accountTitle.trim(),
  number: values.number.trim(),
});

export interface PricingValues {
  /** Major units as typed: "250" or "5.90". */
  feePk: string;
  feeDe: string;
  vat: string;
  holdMinutes: string;
}

/** A fee typed in rupees or euros, as paisa / cents, or null when it is not a valid amount. */
export const feeToMinor = (text: string): number | null =>
  parseMajorToMinor(text);

export function pricingProblems(
  values: PricingValues,
): Problems<PricingValues> {
  const problems: Record<string, string> = {};
  const fee = (key: "feePk" | "feeDe") => {
    const minor = feeToMinor(values[key]);
    if (minor === null) problems[key] = "Enter an amount, like 250 or 5.90";
    else if (minor > 100_000_000) problems[key] = "That fee is too large";
  };
  fee("feePk");
  fee("feeDe");

  const vat = values.vat.trim();
  const vatNumber = Number(vat);
  if (!/^\d+(\.\d{1,2})?$/.test(vat) || vatNumber < 0 || vatNumber > 50) {
    problems.vat = "Enter a rate from 0 to 50, with at most two decimals";
  }

  const minutes = Number(values.holdMinutes);
  if (
    !/^\d+$/.test(values.holdMinutes.trim()) ||
    minutes < 5 ||
    minutes > 1440
  ) {
    problems.holdMinutes = "Enter whole minutes, from 5 to 1440";
  }

  return problems;
}

/** How long an order waiting for a transfer holds its stock, in whole hours. */
export function holdHoursProblem(text: string): string | undefined {
  const hours = Number(text);
  if (!/^\d+$/.test(text.trim()) || hours < 1 || hours > 336) {
    return "Enter whole hours, from 1 to 336";
  }
  return undefined;
}

export interface ContactValues {
  email: string;
  address: string;
  customerServiceLabel: string;
  customerServicePhone: string;
}

export function contactProblems(
  values: ContactValues,
): Problems<ContactValues> {
  const problems: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    problems.email = "Enter a valid email address";
  }
  required(problems, "address", values.address, "address", 200);
  required(
    problems,
    "customerServiceLabel",
    values.customerServiceLabel,
    "label",
    80,
  );
  if (!/^\+?[\d\s()-]{3,30}$/.test(values.customerServicePhone.trim())) {
    problems.customerServicePhone = "Enter a valid phone number";
  }
  return problems;
}
