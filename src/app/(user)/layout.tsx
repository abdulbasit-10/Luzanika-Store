import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AccountShell } from "@/features/account/account-shell";

/**
 * The signed-in area: /account, the saved addresses, the order history and
 * the wishlist. Like the Figma user pages it has a white header and footer
 * around the grey page; the rest of the shop keeps the grey bars (see the
 * (site) layout).
 */
export default function UserLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header tone="white" />
      <AccountShell>{children}</AccountShell>
      <Footer tone="white" />
    </>
  );
}
