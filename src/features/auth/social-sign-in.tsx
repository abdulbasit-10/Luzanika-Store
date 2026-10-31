"use client";

import { useState } from "react";

import { AppleIcon, GoogleIcon } from "@/components/shared/social-icons";

const providers = [
  { name: "Google", icon: GoogleIcon, className: "bg-white" },
  { name: "Apple", icon: AppleIcon, className: "bg-white/40" },
] as const;

/*
 * Google and Apple sign-in need the backend (OAuth), so for now the buttons
 * only tell the visitor they are not available yet.
 */
export function SocialSignIn() {
  const [unavailable, setUnavailable] = useState<string | null>(null);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {providers.map(({ name, icon: Icon, className }) => (
          <button
            key={name}
            type="button"
            onClick={() => setUnavailable(name)}
            className={`flex h-10 items-center justify-center gap-2 rounded-md border border-black/5 px-2 text-xs font-medium transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
          >
            <Icon />
            Sign in with {name}
          </button>
        ))}
      </div>
      <p role="status" className="mt-2 min-h-4 text-center text-xs text-accent">
        {unavailable ? `Sign in with ${unavailable} isn't available yet.` : ""}
      </p>
    </div>
  );
}
