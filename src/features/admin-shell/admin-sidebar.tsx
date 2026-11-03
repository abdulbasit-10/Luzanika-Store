"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAdminSession, useSignOut } from "./admin-session";
import {
  ADMIN_SETTINGS_ITEM,
  canSee,
  isActive,
  visibleNavGroups,
  type AdminNavItem,
} from "./admin-nav";
import { cn } from "@/utils/cn";

/*
 * Item height follows the window height (dvh) so the whole menu fits a laptop
 * screen without scrolling; the sidebar only scrolls when it truly cannot fit.
 */
const itemClass =
  "flex w-full items-center gap-2 rounded-lg px-4 py-[clamp(0.5rem,1.7dvh,0.875rem)] text-[0.9375rem] leading-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        itemClass,
        active
          ? "bg-white text-foreground"
          : "text-muted-foreground hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}

/** The dark menu on the left. Under 1024px it slides in over the page. */
export function AdminSidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { staff, permissions } = useAdminSession();
  const { isSuperAdmin } = staff;
  const groups = visibleNavGroups({ isSuperAdmin, permissions });
  const signOut = useSignOut();
  const showSettings = canSee(ADMIN_SETTINGS_ITEM, {
    isSuperAdmin,
    permissions,
  });

  return (
    <aside
      id="admin-sidebar"
      className={cn(
        "absolute inset-y-0 left-0 z-30 flex w-[clamp(15rem,20vw,16.5rem)] flex-col overflow-y-auto bg-foreground px-6 py-[clamp(0.75rem,2.6dvh,1.125rem)] transition-[transform,visibility] duration-200 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full max-lg:invisible",
      )}
    >
      <nav aria-label="Admin" className="flex flex-col gap-3">
        <p className="text-[0.625rem] tracking-wide text-muted-foreground">
          MAIN MENU
        </p>
        <div className="flex flex-col gap-[clamp(0.5rem,1.6dvh,1rem)]">
          {groups.map((group, index) => (
            <div key={group[0].href} className="flex flex-col gap-1">
              {index > 0 ? (
                <hr className="mx-auto mb-[clamp(0.25rem,1dvh,0.75rem)] w-[80%] border-0 border-t border-muted-foreground/40" />
              ) : null}
              {group.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-4">
        {showSettings ? (
          <NavLink
            item={ADMIN_SETTINGS_ITEM}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ) : null}
        <button
          type="button"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          className={cn(
            itemClass,
            "text-muted-foreground hover:bg-white/10 hover:text-white disabled:opacity-50",
          )}
        >
          <LogOut aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
          {signOut.isPending ? "Signing out…" : "Log Out"}
        </button>
      </div>
    </aside>
  );
}
