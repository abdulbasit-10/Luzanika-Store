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
 * The menu must never scroll, on any laptop or screen. So the height of every
 * item is worked out from the height of the window: the room left under the
 * header and the top and bottom spacing, shared by the 13 entries (11 in the menu,
 * Settings and Log Out), never smaller than 1.5rem and never taller than 2.75rem.
 * The 13 and the 17rem / 12.5rem are written out in full in the classes below (Tailwind
 * only generates classes it can read as whole words). When the menu gets more entries,
 * change the 13 in both.
 */
/**
 * While developing, Next.js draws its round "N" button in the bottom-left corner
 * of the window. Log Out is kept clear above it (4.5rem of space under the menu),
 * which is why the room left is smaller there. A real visitor never sees that
 * button, so production uses the normal padding.
 */
const IS_DEV = process.env.NODE_ENV === "development";
const BOTTOM_PADDING = IS_DEV ? "pb-[4.5rem]" : "pb-[0.75rem]";
const ITEM_HEIGHT = IS_DEV
  ? "h-[clamp(1.5rem,calc((100dvh-17rem)/13),2.75rem)]"
  : "h-[clamp(1.5rem,calc((100dvh-12.5rem)/13),2.75rem)]";

const itemClass = cn(
  "flex w-full shrink-0 items-center gap-2 rounded-lg px-4 text-[0.9rem] leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  ITEM_HEIGHT,
);

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
          ? "bg-white font-semibold text-foreground"
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
        "absolute inset-y-0 left-0 z-30 flex w-[clamp(15rem,20vw,16.5rem)] flex-col overflow-hidden bg-foreground px-6 pt-[clamp(0.5rem,1.6dvh,1.125rem)] transition-[transform,visibility] duration-200 lg:static lg:translate-x-0",
        BOTTOM_PADDING,
        open ? "translate-x-0" : "-translate-x-full max-lg:invisible",
      )}
    >
      <nav
        aria-label="Admin"
        className="flex min-h-0 flex-1 flex-col gap-[clamp(0.125rem,0.8dvh,0.75rem)] overflow-y-auto overscroll-contain"
      >
        <p className="text-[0.625rem] tracking-wide text-muted-foreground">
          MAIN MENU
        </p>
        <div className="flex flex-col gap-[clamp(0.125rem,0.8dvh,0.75rem)]">
          {groups.map((group, index) => (
            <div key={group[0].href} className="flex flex-col gap-1">
              {index > 0 ? (
                <hr className="mx-auto mb-[clamp(0.0625rem,0.4dvh,0.5rem)] w-[80%] border-0 border-t border-muted-foreground/40" />
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

      <div className="flex shrink-0 flex-col gap-1 pt-[clamp(0.125rem,0.8dvh,1rem)]">
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
