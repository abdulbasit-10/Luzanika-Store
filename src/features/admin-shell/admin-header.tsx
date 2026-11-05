"use client";

import { ChevronDown, Globe, Menu, ShieldCheck, X } from "lucide-react";

import { Dropdown } from "@/components/ui/dropdown";
import { REGION_LIST } from "@/config/regions";
import { AdminBrand } from "@/features/admin-auth/admin-auth-ui";
import { cn } from "@/utils/cn";

import { useAdminMarket, type AdminMarket } from "./admin-market";
import { useAdminSession, useSignOut } from "./admin-session";

const pillClass =
  "inline-flex items-center gap-2 rounded-full border border-muted-foreground px-3 py-[clamp(0.25rem,1.1dvh,0.5rem)] text-sm whitespace-nowrap sm:px-4";

const MARKET_CHOICES: { value: AdminMarket; label: string }[] = [
  { value: "all", label: "All Markets" },
  ...REGION_LIST.map((region) => ({ value: region.code, label: region.name })),
];

function MarketPicker() {
  const { market, setMarket } = useAdminMarket();
  const current = MARKET_CHOICES.find((choice) => choice.value === market);
  return (
    <Dropdown
      triggerLabel="Select market"
      triggerClassName={cn(pillClass, "hover:bg-black/5")}
      trigger={
        <>
          <span className="hidden text-muted-foreground sm:inline">
            Select Market:
          </span>
          <Globe aria-hidden className="size-[1.125rem]" />
          <span className="font-button font-medium">{current?.label}</span>
          <ChevronDown aria-hidden className="size-4" />
        </>
      }
    >
      {MARKET_CHOICES.map((choice) => (
        <button
          key={choice.value}
          type="button"
          onClick={() => setMarket(choice.value)}
          aria-pressed={choice.value === market}
          className={cn(
            "block w-full px-4 py-2 text-left text-sm hover:bg-muted",
            choice.value === market && "font-semibold",
          )}
        >
          {choice.label}
        </button>
      ))}
    </Dropdown>
  );
}

function AccountMenu() {
  const { staff } = useAdminSession();
  const signOut = useSignOut();
  const initials =
    `${staff.firstName.charAt(0)}${staff.lastName.charAt(0)}`.toUpperCase();
  return (
    <Dropdown
      align="end"
      triggerLabel="Account"
      triggerClassName="rounded-full"
      panelClassName="w-60 py-0"
      trigger={
        <span className="flex size-[clamp(2.25rem,5.4dvh,3rem)] items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white">
          {initials}
        </span>
      }
    >
      <div className="border-b border-border px-4 py-3">
        <p className="truncate text-sm font-semibold">
          {staff.firstName} {staff.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{staff.email}</p>
      </div>
      <button
        type="button"
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-50"
      >
        {signOut.isPending ? "Signing out…" : "Sign out"}
      </button>
    </Dropdown>
  );
}

/** The grey bar on top: logo, who is signed in, the market filter and the account menu. */
export function AdminHeader({
  menuOpen,
  onToggleMenu,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const { staff } = useAdminSession();
  const { isSuperAdmin } = staff;
  return (
    <header className="flex h-[clamp(3.5rem,9dvh,5.8125rem)] shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-[clamp(1rem,2vw,1.5rem)]">
      <div className="flex min-w-0 items-center gap-[clamp(1rem,2.4vw,2rem)]">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
          className="rounded-md p-1.5 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
        >
          {menuOpen ? (
            <X aria-hidden className="size-6" />
          ) : (
            <Menu aria-hidden className="size-6" />
          )}
        </button>
        <AdminBrand className="shrink-0 max-sm:[&>span]:hidden" />
        <div className="hidden items-center gap-3 md:flex">
          <div className={pillClass}>
            <span className="text-muted-foreground">ADMIN ROLE</span>
            <ShieldCheck aria-hidden className="size-[1.125rem]" />
            <span className="font-button font-medium">
              {isSuperAdmin ? "Super Admin" : "Staff"}
            </span>
          </div>
          <MarketPicker />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <MarketPicker />
        </div>
        <AccountMenu />
      </div>
    </header>
  );
}
