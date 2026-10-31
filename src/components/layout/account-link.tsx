"use client";

import { User } from "lucide-react";
import Link from "next/link";

import { headerActions } from "@/config/navigation";
import { useAccountHref } from "@/features/auth/use-account-href";

export function AccountLink() {
  const href = useAccountHref();

  return (
    <Link
      href={href}
      aria-label={headerActions.account.label}
      className="hidden items-center justify-center sm:flex"
    >
      <User aria-hidden className="size-4.5" />
    </Link>
  );
}
