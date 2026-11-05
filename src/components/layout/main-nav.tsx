"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Dropdown } from "@/components/ui/dropdown";
import { categoryLinks, mainNav, type NavLink } from "@/config/navigation";
import { cn } from "@/utils/cn";

/** Reserves the width of the label in bold, so the links around it do not move when it turns bold. */
const KEEP_WIDTH =
  "after:invisible after:block after:h-0 after:overflow-hidden after:font-bold after:content-[attr(data-label)]";

export function isActive(pathname: string, { href, exact }: NavLink) {
  return exact ? pathname === href : pathname.startsWith(href);
}

function MainNavLink({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(pathname, link);

  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      data-label={link.label}
      className={cn(
        "flex flex-col items-center border-b py-1 transition-colors hover:border-foreground",
        KEEP_WIDTH,
        active ? "border-foreground font-bold" : "border-transparent",
      )}
    >
      {link.label}
    </Link>
  );
}

export function MainNav() {
  const pathname = usePathname();
  const [home, ...rest] = mainNav.links;
  const categoryActive = categoryLinks.some((link) => isActive(pathname, link));

  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-8 text-sm font-medium">
        <li>
          <MainNavLink link={home} pathname={pathname} />
        </li>
        <li>
          <Dropdown
            triggerClassName={cn(
              "border-b py-1",
              categoryActive
                ? "border-foreground font-bold"
                : "border-transparent",
            )}
            trigger={
              <>
                <span
                  data-label={mainNav.categoryLabel}
                  className={cn("flex flex-col items-center", KEEP_WIDTH)}
                >
                  {mainNav.categoryLabel}
                </span>
                <ChevronDown aria-hidden className="size-3.5" />
              </>
            }
          >
            <ul>
              {categoryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block px-4 py-2 text-sm hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Dropdown>
        </li>
        {rest.map((link) => (
          <li key={link.href}>
            <MainNavLink link={link} pathname={pathname} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
