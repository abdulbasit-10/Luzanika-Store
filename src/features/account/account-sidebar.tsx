"use client";

import { useMutation } from "@tanstack/react-query";
import {
  CircleCheck,
  ClipboardList,
  Heart,
  LogOut,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { toast } from "@/components/ui/toaster";
import { logoutUser } from "@/features/auth/auth-service";
import { useSignOut } from "@/features/auth/use-session";
import { cn } from "@/utils/cn";

const items: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Account", href: "/account", icon: User },
  { label: "Saved Addresses", href: "/account/addresses", icon: CircleCheck },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Order History", href: "/orders", icon: ClipboardList },
];

/** Reserves the width of the label in bold, so the row does not change size when the link turns bold. */
const reserveBold =
  "after:invisible after:block after:h-0 after:overflow-hidden after:font-bold after:content-[attr(data-label)]";

const itemClass =
  "flex h-11 shrink-0 items-center gap-2.5 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:w-full";

/** Links between the account pages, and Log out, on the dark panel of the Figma. A row you can scroll on small screens. */
export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useSignOut();

  const { mutate, isPending } = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      signOut();
      toast("You've been logged out.");
      router.push("/");
    },
    onError: () => toast.error("Couldn't log you out. Please try again."),
  });

  return (
    <nav
      aria-label="Account"
      className="flex gap-2 overflow-x-auto pb-1 lg:h-full lg:flex-col lg:gap-[clamp(0.75rem,2.6dvh,1.6rem)] lg:overflow-visible lg:pb-0"
    >
      {items.map(({ label, href, icon: Icon }) => {
        const active =
          href === "/account" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              itemClass,
              active
                ? "bg-white font-bold text-foreground"
                : "text-white/80 hover:bg-white/10",
            )}
          >
            <Icon aria-hidden className="size-4" strokeWidth={1.75} />
            <span data-label={label} className={reserveBold}>
              {label}
            </span>
          </Link>
        );
      })}

      <button
        type="button"
        disabled={isPending}
        onClick={() => mutate()}
        className={cn(
          itemClass,
          "px-0 text-[#ff6b6b] hover:bg-white/10 disabled:opacity-60 lg:mt-auto lg:px-4",
        )}
      >
        <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
        {isPending ? "Logging out…" : "Log out"}
      </button>
    </nav>
  );
}
