import { AccountShell } from "@/features/account/account-shell";

/** The signed-in area: /account, and later the saved addresses, wishlist and order history pages. */
export default function AccountLayout({ children }: LayoutProps<"/">) {
  return <AccountShell>{children}</AccountShell>;
}
