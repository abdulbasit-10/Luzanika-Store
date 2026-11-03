import { notFound } from "next/navigation";

import {
  ADMIN_SECTION_SLUGS,
  sectionLabel,
} from "@/features/admin-shell/admin-nav";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";

/**
 * Stands in for the sidebar's screens that are not built yet. Building one
 * means adding its own folder next to this one, which takes over its address.
 */
export const instant = false;

export function generateStaticParams() {
  return ADMIN_SECTION_SLUGS.map((section) => ({ section }));
}

export default async function AdminSectionPage({
  params,
}: PageProps<"/admin/[section]">) {
  const { section } = await params;
  if (!ADMIN_SECTION_SLUGS.includes(section)) notFound();

  return (
    <AdminPageHead
      title={sectionLabel(section) ?? section}
      subtitle="This screen is being built."
    />
  );
}
