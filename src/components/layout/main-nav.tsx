"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Dropdown } from "@/components/ui/dropdown";
import { categoryLinks, mainNav, type NavLink } from "@/config/navigation";
import { cn } from "@/utils/cn";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function MainNavLink({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(pathname, link.href);

  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border-b py-1 transition-colors hover:border-foreground",
        active ? "border-foreground" : "border-transparent",
      )}
    >
      {link.label}
    </Link>
  );
}

export function MainNav() {
  const pathname = usePathname();
  const [home, ...rest] = mainNav.links;
  const categoryActive = categoryLinks.some((link) =>
    isActive(pathname, link.href),
  );

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
              categoryActive ? "border-foreground" : "border-transparent",
            )}
            trigger={
              <>
                {mainNav.categoryLabel}
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
