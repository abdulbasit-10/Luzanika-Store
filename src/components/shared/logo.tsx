import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/utils/cn";

interface LogoProps {
  tone?: "dark" | "light";
  className?: string;
}

/** The logo file has a white background, so blend modes make it work on both header and footer. */
export function Logo({ tone = "dark", className }: LogoProps) {
  const isLight = tone === "light";

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
          "size-9",
          isLight ? "mix-blend-screen invert" : "mix-blend-multiply",
        )}
      />
      <span
        className={cn(
          "-ml-1.5 font-heading text-base font-medium",
          isLight && "text-primary-foreground",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
