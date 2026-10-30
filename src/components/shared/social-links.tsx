import {
  FacebookIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/shared/social-icons";
import { siteConfig } from "@/config/site";
import { cn } from "@/utils/cn";

const socialIcons = {
  LinkedIn: LinkedInIcon,
  X: XIcon,
  Facebook: FacebookIcon,
} as const;

const variants = {
  footer: {
    list: "gap-2",
    link: "size-7 bg-white/15 text-white hover:bg-white/30",
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
