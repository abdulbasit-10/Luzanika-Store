import type { Metadata } from "next";

import { ProfileView } from "@/features/account/profile-view";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Luzanika profile and contact details.",
  robots: { index: false },
};

export default function AccountPage() {
  return <ProfileView />;
}
