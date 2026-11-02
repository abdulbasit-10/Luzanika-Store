import type { Metadata } from "next";

import { AddressesView } from "@/features/addresses/addresses-view";

export const metadata: Metadata = {
  title: "Saved Addresses",
  description: "Your saved delivery addresses at Luzanika.",
  robots: { index: false },
};

export default function AddressesPage() {
  return <AddressesView />;
}
