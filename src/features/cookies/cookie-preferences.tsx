"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  cookieTypes,
  type CookieCategoryKey,
} from "@/features/cookies/cookie-content";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  NO_OPTIONAL_COOKIES,
  useConsentStore,
  type CookieConsent,
} from "@/stores/consent-store";

/**
 * Switches for each cookie category. Edits stay in a draft until "Save"; the
 * saved choice (also set by the consent popup) is stored in a cookie.
 */
export function CookiePreferences() {
  const consent = useConsentStore((state) => state.consent);
  const setConsent = useConsentStore((state) => state.setConsent);
  const hydrated = useHydrated();
  const [draft, setDraft] = useState<CookieConsent | null>(null);
  const [saved, setSaved] = useState(false);

  const values = draft ?? (hydrated ? consent : null) ?? NO_OPTIONAL_COOKIES;

  function toggle(key: CookieCategoryKey, checked: boolean) {
    setDraft({ ...values, [key]: checked });
    setSaved(false);
  }

  function save() {
    setConsent(values);
    setDraft(null);
    setSaved(true);
  }

  return (
    <div
      id="cookie-preferences"
      className="scroll-mt-24 rounded-2xl bg-panel p-4 lg:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Direct client control
          </p>
          <h3 className="mt-1 font-heading text-2xl leading-tight font-medium">
            Cookie Preferences
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage how cookies are deployed during your visit to Luzanika.
          </p>
        </div>
        <Button
          onClick={save}
          className="rounded-sm px-5 py-3 text-[10px] tracking-[0.12em] uppercase"
        >
          Save my preferences
        </Button>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {cookieTypes.map((type) => {
          const essential = type.key === "essential";
          const labelId = `cookie-switch-${type.key}`;
          return (
            <li
              key={type.key}
              className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3"
            >
              <div>
                <p id={labelId} className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">{type.title}</span>
                  {essential ? (
                    <span className="rounded-sm bg-panel px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                      Required
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {type.switchText}
                </p>
              </div>
              <Switch
                aria-labelledby={labelId}
                checked={
                  essential ? true : values[type.key as CookieCategoryKey]
                }
                locked={essential}
                onCheckedChange={
                  essential
                    ? undefined
                    : (checked) =>
                        toggle(type.key as CookieCategoryKey, checked)
                }
              />
            </li>
          );
        })}
      </ul>

      <p role="status" className="mt-4 min-h-5 text-xs text-success">
        {saved ? "Your cookie preferences have been saved." : ""}
      </p>
    </div>
  );
}
