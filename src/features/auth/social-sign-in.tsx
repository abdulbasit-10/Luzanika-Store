"use client";

import { AppleIcon, GoogleIcon } from "@/components/shared/social-icons";
import { toast } from "@/components/ui/toaster";

const providers = [
  { name: "Google", icon: GoogleIcon, className: "bg-white" },
  { name: "Apple", icon: AppleIcon, className: "bg-white/40" },
] as const;

/*
 * Google and Apple sign-in need the backend (OAuth), so for now the buttons
 * only tell the visitor they are not available yet.
 */
export function SocialSignIn() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map(({ name, icon: Icon, className }) => (
        <button
          key={name}
          type="button"
          onClick={() =>
            toast.info(`Sign in with ${name} isn't available yet.`, {
              id: "social-sign-in",
            })
          }
          className={`flex h-10 items-center justify-center gap-2 rounded-md border border-black/5 px-2 text-xs font-medium transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
        >
          <Icon />
          Sign in with {name}
        </button>
      ))}
    </div>
  );
}
