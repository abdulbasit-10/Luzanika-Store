import { Heart, Search, User } from "lucide-react";
import Link from "next/link";

import { CartLink } from "@/components/layout/cart-link";
import { MainNav } from "@/components/layout/main-nav";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/layout/mobile-nav";
import { Logo } from "@/components/shared/logo";
import { RegionSelector } from "@/components/shared/region-selector";
import { Container } from "@/components/ui/container";
import { headerActions } from "@/config/navigation";

const searchLink = { ...headerActions.search, icon: Search };
const trailingLinks = [
  { ...headerActions.wishlist, icon: Heart },
  { ...headerActions.account, icon: User },
];

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

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-surface">
      <Container className="flex h-(--header-height) items-center justify-between gap-6">
        <Logo />
        <MainNav />
        <div className="flex items-center gap-3 sm:gap-4">
          <RegionSelector />
          <IconLink {...searchLink} />
          <CartLink />
          {trailingLinks.map((link) => (
            <IconLink key={link.href} {...link} />
          ))}
          <MobileNavToggle />
        </div>
      </Container>
      <MobileNavPanel />
    </header>
  );
}
