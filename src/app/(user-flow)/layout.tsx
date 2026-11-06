import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

/**
 * Sign up, forgot password and reset password. Like the Figma user pages they
 * have a white header and footer around the grey page; the shop pages keep the
 * grey bars (see the (site) layout). Sign in has its own full-screen layout.
 */
export default function UserFlowLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header tone="white" />
      {children}
      <Footer tone="white" />
    </>
  );
}
