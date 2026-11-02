"use client";

import { Settings2, ShieldCheck, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { consentNotice } from "@/features/cookies/cookie-content";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  ALL_COOKIES,
  NO_OPTIONAL_COOKIES,
  useConsentStore,
} from "@/stores/consent-store";

const actionClass =
  "rounded-sm px-4 py-3 text-[10px] tracking-[0.12em] uppercase";

/** Asks first-time visitors which cookies they allow; hidden once they choose. */
export function CookieConsentBanner() {
  const consent = useConsentStore((state) => state.consent);
  const setConsent = useConsentStore((state) => state.setConsent);
  const hydrated = useHydrated();

  if (!hydrated || consent) return null;

  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-50 rounded-lg bg-panel p-5 shadow-overlay sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[10px] font-medium tracking-[0.15em] uppercase">
          <ShieldCheck aria-hidden className="size-3.5" />
          {consentNotice.title}
        </h2>
        <button
          type="button"
          aria-label="Close and reject optional cookies"
          onClick={() => setConsent(NO_OPTIONAL_COOKIES)}
          className="-mr-1 flex size-6 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        {consentNotice.text}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => setConsent(ALL_COOKIES)} className={actionClass}>
          Accept all
        </Button>
        <Button
          variant="secondary"
          onClick={() => setConsent(NO_OPTIONAL_COOKIES)}
          className={`${actionClass} border-0 bg-black/[0.06] hover:bg-black/10`}
        >
          Reject optional
        </Button>
        <Link
          href="/cookies#cookie-preferences"
          className="ml-auto flex items-center gap-1.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Settings2 aria-hidden className="size-3" />
          Settings
        </Link>
      </div>
    </section>
  );
}
