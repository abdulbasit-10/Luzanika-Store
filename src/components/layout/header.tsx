import { Search } from "lucide-react";
import Link from "next/link";

import { AccountLink } from "@/components/layout/account-link";
import { CartLink } from "@/components/layout/cart-link";
import { MainNav } from "@/components/layout/main-nav";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/layout/mobile-nav";
import { WishlistLink } from "@/components/layout/wishlist-link";
import { Logo } from "@/components/shared/logo";
import { RegionSelector } from "@/components/shared/region-selector";
import { Container } from "@/components/ui/container";
import { headerActions } from "@/config/navigation";

const searchLink = { ...headerActions.search, icon: Search };

function IconLink({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string;
  icon: typeof Search;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="hidden items-center justify-center sm:flex"
    >
      <Icon aria-hidden className="size-4.5" />
    </Link>
  );
}

/** `white` is for the signed-in account pages; every other page keeps the grey bar. */
export function Header({ tone = "grey" }: { tone?: "grey" | "white" }) {
  return (
    <header
      className={`sticky top-0 z-40 ${tone === "white" ? "bg-surface" : "bg-background"}`}
    >
      <Container className="flex h-(--header-height) items-center justify-between gap-6">
        <Logo />
        <MainNav />
        <div className="flex items-center gap-3 sm:gap-4">
          <RegionSelector />
          <IconLink {...searchLink} />
          <CartLink />
          <WishlistLink />
          <AccountLink />
          <MobileNavToggle />
        </div>
      </Container>
      <MobileNavPanel />
    </header>
  );
}
