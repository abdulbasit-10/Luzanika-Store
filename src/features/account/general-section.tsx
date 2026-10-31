"use client";

import { useState } from "react";

import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import {
  ProfileSelect,
  profileLabelClass,
} from "@/features/account/profile-fields";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  type Language,
} from "@/features/account/profile-options";
import { useUpdateProfile } from "@/features/account/use-update-profile";
import type { AuthUser } from "@/features/auth/auth-service";

/*
 * The language is saved as soon as it changes (there is no Edit button in the
 * design). It is only stored for now; the site itself is not translated yet.
 */
export function GeneralSection({ user }: { user: AuthUser }) {
  const saved = user.language ?? DEFAULT_LANGUAGE;
  const [language, setLanguage] = useState<Language>(saved);
  const { mutate } = useUpdateProfile();

  function change(next: Language) {
    setLanguage(next);
    mutate(
      { language: next },
      {
        onSuccess: () => toast.success("Language updated"),
        onError: () => {
          setLanguage(saved);
          toast.error("Couldn't save your language. Please try again.");
        },
      },
    );
  }

  return (
    <section aria-labelledby="profile-general-title">
      <h2 id="profile-general-title" className="text-sm font-semibold">
        General
      </h2>
      <div className="mt-2">
        <Field
          id="profile-language"
          label="Language"
          labelClassName={profileLabelClass}
        >
          <ProfileSelect
            id="profile-language"
            editing
            value={language}
            onChange={(event) => change(event.target.value as Language)}
          >
            {LANGUAGE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </ProfileSelect>
        </Field>
      </div>
    </section>
  );
}
