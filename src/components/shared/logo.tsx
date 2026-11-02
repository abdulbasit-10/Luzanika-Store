import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/utils/cn";

interface LogoProps {
  tone?: "dark" | "light";
  /** "lg" is the big logo on the login photo. */
  size?: "md" | "lg";
  className?: string;
}

/** The logo file has a white background, so blend modes make it work on both header and footer. */
export function Logo({ tone = "dark", size = "md", className }: LogoProps) {
  const isLight = tone === "light";
  const large = size === "lg";

  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} home`}
      className={cn("inline-flex items-center", className)}
    >
      <Image
        src="/images/logo.jpeg"
        alt=""
        width={36}
        height={36}
        className={cn(
          large ? "size-12" : "size-9",
          isLight ? "mix-blend-screen invert" : "mix-blend-multiply",
        )}
      />
      <span
        className={cn(
          "font-heading font-medium",
          large ? "-ml-2 text-4xl" : "-ml-1.5 text-base",
          isLight && "text-primary-foreground",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
