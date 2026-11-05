import type { ComponentProps, ReactElement } from "react";

import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  XIcon,
} from "@/components/shared/social-icons";
import { siteConfig } from "@/config/site";
import { cn } from "@/utils/cn";

/** One icon for every network named in siteConfig.socials; adding a network there without an icon here is a type error. */
const socialIcons: Record<
  (typeof siteConfig.socials)[number]["name"] | "LinkedIn" | "X",
  (props: ComponentProps<"svg">) => ReactElement
> = {
  LinkedIn: LinkedInIcon,
  X: XIcon,
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  TikTok: TikTokIcon,
};

const variants = {
  footer: {
    list: "gap-2.5",
    link: "size-[35px] bg-foreground text-white hover:bg-foreground/85",
  },
  contact: {
    list: "gap-3",
    link: "size-9.5 bg-foreground text-white hover:bg-foreground/85",
  },
} as const;

export function SocialLinks({
  variant,
  className,
}: {
  variant: keyof typeof variants;
  className?: string;
}) {
  const styles = variants[variant];

  return (
    <ul className={cn("flex", styles.list, className)}>
      {siteConfig.socials.map(({ name, href }) => {
        const Icon = socialIcons[name];
        return (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={name}
              className={cn(
                "flex items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                styles.link,
              )}
            >
              <Icon />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
