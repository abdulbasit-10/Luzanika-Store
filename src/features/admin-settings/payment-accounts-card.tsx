"use client";

import { useState, type ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import {
  DetailCard,
  Field,
  inputClass,
} from "@/features/admin-orders/order-detail-ui";

import type { AdminSettings } from "./admin-settings-service";
import {
  bankProblems,
  cleanBank,
  cleanWallet,
  holdHoursProblem,
  walletProblems,
} from "./settings-forms";
import { SaveBar, useSaveSettings } from "./settings-ui";

type WalletKey = "easypaisa" | "jazzcash";

const emptyBank = { bankName: "", accountTitle: "", accountNumber: "" };
const emptyWallet = { accountTitle: "", number: "" };

function MethodBlock({
  title,
  help,
  enabled,
  onToggle,
  canEdit,
  children,
}: {
  title: string;
  help: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  canEdit: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-lg bg-white p-3">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            {enabled ? help : "Not offered at checkout."}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          locked={!canEdit}
          aria-label={`Offer ${title} at checkout`}
        />
      </div>
      {enabled ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
      ) : null}
    </fieldset>
  );
}

/**
 * Where customers send the money for bank transfer, Easypaisa and JazzCash.
 * A method with no account here is not offered at checkout, so this is what
 * turns them on.
 */
export function PaymentAccountsCard({
  settings,
  canEdit,
}: {
  settings: AdminSettings;
  canEdit: boolean;
}) {
  const { payments } = settings;
  const [bankOn, setBankOn] = useState(payments.bank !== null);
  const [bank, setBank] = useState(payments.bank ?? emptyBank);
  const [wallets, setWallets] = useState({
    easypaisa: {
      on: payments.easypaisa !== null,
      ...(payments.easypaisa ?? emptyWallet),
    },
    jazzcash: {
      on: payments.jazzcash !== null,
      ...(payments.jazzcash ?? emptyWallet),
    },
  });
  const [hours, setHours] = useState(String(payments.manualHoldHours));
  const [shown, setShown] = useState(false);
  const save = useSaveSettings("Payment accounts saved");

  const bankIssues = bankOn ? bankProblems(bank) : {};
  const walletIssues = {
    easypaisa: wallets.easypaisa.on ? walletProblems(wallets.easypaisa) : {},
    jazzcash: wallets.jazzcash.on ? walletProblems(wallets.jazzcash) : {},
  };
  const hoursIssue = holdHoursProblem(hours);
  const hasProblems =
    Object.keys(bankIssues).length > 0 ||
    Object.keys(walletIssues.easypaisa).length > 0 ||
    Object.keys(walletIssues.jazzcash).length > 0 ||
    hoursIssue !== undefined;

  const setWallet = (
    key: WalletKey,
    patch: Partial<(typeof wallets)[WalletKey]>,
  ) =>
    setWallets((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setShown(true);
    if (hasProblems) return;
    save.mutate({
      payments: {
        manualHoldHours: Number(hours),
        bank: bankOn ? cleanBank(bank) : null,
        easypaisa: wallets.easypaisa.on ? cleanWallet(wallets.easypaisa) : null,
        jazzcash: wallets.jazzcash.on ? cleanWallet(wallets.jazzcash) : null,
      },
    });
  }

  const walletFields = (key: WalletKey, label: string) => {
    const values = wallets[key];
    const issues = shown ? walletIssues[key] : {};
    return (
      <>
        <Field
          id={`${key}-title`}
          label="Account title"
          error={issues.accountTitle}
        >
          <input
            id={`${key}-title`}
            value={values.accountTitle}
            onChange={(e) => setWallet(key, { accountTitle: e.target.value })}
            readOnly={!canEdit}
            maxLength={80}
            aria-invalid={Boolean(issues.accountTitle)}
            aria-describedby={`${key}-title-error`}
            className={inputClass}
          />
        </Field>
        <Field
          id={`${key}-number`}
          label={`${label} number`}
          error={issues.number}
        >
          <input
            id={`${key}-number`}
            inputMode="tel"
            value={values.number}
            onChange={(e) => setWallet(key, { number: e.target.value })}
            readOnly={!canEdit}
            placeholder="0300 1234567"
            aria-invalid={Boolean(issues.number)}
            aria-describedby={`${key}-number-error`}
            className={inputClass}
          />
        </Field>
      </>
    );
  };

  const bankShown = shown ? bankIssues : {};

  return (
    <DetailCard title="Payment accounts (Pakistan)">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Cash on delivery is always offered. A transfer method appears at
          checkout once you switch it on and save its account. Customers send
          the money, then send you the transaction ID or a screenshot to check.
        </p>

        <MethodBlock
          title="Bank transfer"
          help="Customers see these details at checkout."
          enabled={bankOn}
          onToggle={setBankOn}
          canEdit={canEdit}
        >
          <Field id="bank-name" label="Bank name" error={bankShown.bankName}>
            <input
              id="bank-name"
              value={bank.bankName}
              onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
              readOnly={!canEdit}
              maxLength={80}
              aria-invalid={Boolean(bankShown.bankName)}
              aria-describedby="bank-name-error"
              className={inputClass}
            />
          </Field>
          <Field
            id="bank-title"
            label="Account title"
            error={bankShown.accountTitle}
          >
            <input
              id="bank-title"
              value={bank.accountTitle}
              onChange={(e) =>
                setBank({ ...bank, accountTitle: e.target.value })
              }
              readOnly={!canEdit}
              maxLength={80}
              aria-invalid={Boolean(bankShown.accountTitle)}
              aria-describedby="bank-title-error"
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              id="bank-number"
              label="Account number or IBAN"
              error={bankShown.accountNumber}
            >
              <input
                id="bank-number"
                value={bank.accountNumber}
                onChange={(e) =>
                  setBank({ ...bank, accountNumber: e.target.value })
                }
                readOnly={!canEdit}
                maxLength={40}
                aria-invalid={Boolean(bankShown.accountNumber)}
                aria-describedby="bank-number-error"
                className={inputClass}
              />
            </Field>
          </div>
        </MethodBlock>

        <MethodBlock
          title="Easypaisa"
          help="Customers see this number at checkout."
          enabled={wallets.easypaisa.on}
          onToggle={(on) => setWallet("easypaisa", { on })}
          canEdit={canEdit}
        >
          {walletFields("easypaisa", "Easypaisa")}
        </MethodBlock>

        <MethodBlock
          title="JazzCash"
          help="Customers see this number at checkout."
          enabled={wallets.jazzcash.on}
          onToggle={(on) => setWallet("jazzcash", { on })}
          canEdit={canEdit}
        >
          {walletFields("jazzcash", "JazzCash")}
        </MethodBlock>

        <div className="max-w-xs">
          <Field
            id="hold-hours"
            label="Hold the order while waiting for the money (hours)"
            error={shown ? hoursIssue : undefined}
          >
            <input
              id="hold-hours"
              inputMode="numeric"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              readOnly={!canEdit}
              aria-invalid={shown && Boolean(hoursIssue)}
              aria-describedby="hold-hours-error"
              className={inputClass}
            />
          </Field>
        </div>

        <SaveBar
          canEdit={canEdit}
          pending={save.isPending}
          error={save.error}
        />
      </form>
    </DetailCard>
  );
}
