"use client";

import { ContactSection } from "@/features/account/contact-section";
import { DeleteAccount } from "@/features/account/delete-account";
import { GeneralSection } from "@/features/account/general-section";
import { PersonalSection } from "@/features/account/personal-section";
import { PhotoSection } from "@/features/account/photo-section";
import { useAuthStore } from "@/stores/auth-store";

/** The Account page: one white card with the signed-in user's details. */
export function ProfileView() {
  const user = useAuthStore((state) => state.user);

  // The account shell only renders this for a signed-in visitor.
  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-[clamp(0.5rem,2.2dvh,1.5rem)] rounded-2xl bg-white p-[clamp(0.75rem,min(2.6vw,3.4dvh),2.5rem)]">
      <h1 className="sr-only">Account</h1>
      <PhotoSection user={user} />
      <PersonalSection user={user} />
      <ContactSection user={user} />
      {/* Language and Delete share a row so the whole card fits one screen. */}
      <div className="grid items-end gap-x-4 gap-y-3 sm:grid-cols-2">
        <GeneralSection user={user} />
        <div className="sm:justify-self-end">
          <DeleteAccount user={user} />
        </div>
      </div>
    </div>
  );
}
