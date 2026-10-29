import { Heart, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";

import { MainNav } from "@/components/layout/main-nav";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/layout/mobile-nav";
import { Logo } from "@/components/shared/logo";
import { RegionSelector } from "@/components/shared/region-selector";
import { Container } from "@/components/ui/container";
import { headerActions } from "@/config/navigation";
import { cn } from "@/utils/cn";

const iconLinks = [
  { ...headerActions.search, icon: Search, mobileHidden: true },
  { ...headerActions.cart, icon: ShoppingBag, mobileHidden: false },
  { ...headerActions.wishlist, icon: Heart, mobileHidden: true },
  { ...headerActions.account, icon: User, mobileHidden: true },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-surface">
      <Container className="flex h-(--header-height) items-center justify-between gap-6">
        <Logo />
        <MainNav />
        <div className="flex items-center gap-3 sm:gap-4">
          <RegionSelector />
          {iconLinks.map(({ label, href, icon: Icon, mobileHidden }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "items-center justify-center",
                mobileHidden ? "hidden sm:flex" : "flex",
              )}
            >
              <Icon aria-hidden className="size-4.5" />
            </Link>
          ))}
          <MobileNavToggle />
        </div>
      </Container>
      <MobileNavPanel />
    </header>
  );
}
