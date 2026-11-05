"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  categoryLinks,
  headerActions,
  mainNav,
  type NavLink,
} from "@/config/navigation";
import { isActive } from "@/components/layout/main-nav";
import { useAccountHref } from "@/features/auth/use-account-href";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/utils/cn";

export function MobileNavToggle() {
  const isOpen = useUiStore((state) => state.isMobileNavOpen);
  const setOpen = useUiStore((state) => state.setMobileNavOpen);

  return (
    <button
      type="button"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      aria-controls="mobile-nav"
      onClick={() => setOpen(!isOpen)}
      className="flex size-9 items-center justify-center lg:hidden"
    >
      {isOpen ? (
        <X aria-hidden className="size-5" />
      ) : (
        <Menu aria-hidden className="size-5" />
      )}
    </button>
  );
}

function MobileNavSection({
  title,
  links,
  onNavigate,
}: {
  title?: string;
  links: NavLink[];
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-1">
      {title ? (
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </p>
      ) : null}
      <ul>
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              onClick={onNavigate}
              aria-current={isActive(pathname, link) ? "page" : undefined}
              className={cn(
                "block py-2 text-sm",
                isActive(pathname, link) ? "font-bold" : "font-medium",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MobileNavPanel() {
  const isOpen = useUiStore((state) => state.isMobileNavOpen);
  const setOpen = useUiStore((state) => state.setMobileNavOpen);
  const accountHref = useAccountHref();

  if (!isOpen) return null;

  const close = () => setOpen(false);

  return (
    <nav
      id="mobile-nav"
      aria-label="Mobile"
      className="absolute inset-x-0 top-full flex max-h-[calc(100dvh-var(--header-height))] flex-col gap-4 overflow-y-auto border-t border-border bg-background px-(--page-pad) py-4 shadow-overlay lg:hidden"
    >
      <MobileNavSection links={mainNav.links} onNavigate={close} />
      <MobileNavSection
        title={mainNav.categoryLabel}
        links={categoryLinks}
        onNavigate={close}
      />
      <MobileNavSection
        links={[
          headerActions.search,
          headerActions.wishlist,
          { ...headerActions.account, href: accountHref },
        ]}
        onNavigate={close}
      />
    </nav>
  );
}
