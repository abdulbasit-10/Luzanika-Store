import Link from "next/link";
import { cacheLife } from "next/cache";

import { Logo } from "@/components/shared/logo";
import {
  FacebookIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/shared/social-icons";
import { Container } from "@/components/ui/container";
import { footerColumns, footerLegalLinks } from "@/config/navigation";
import { siteConfig } from "@/config/site";

const socialIcons = {
  LinkedIn: LinkedInIcon,
  X: XIcon,
  Facebook: FacebookIcon,
} as const;

const linkClass = "text-xs text-white/80 transition-colors hover:text-white";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");

  return <>{new Date().getFullYear()}</>;
}

export function Footer() {
  const { complaintServices, customerService } = siteConfig.contact;

  return (
    <footer className="bg-primary text-primary-foreground">
      <Container className="py-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)_1.5fr]">
          <div className="flex flex-col gap-4">
            <Logo tone="light" />
            <p className="max-w-52 text-xs text-white/80">
              {siteConfig.tagline}
            </p>
            <ul className="flex gap-2">
              {siteConfig.socials.map(({ name, href }) => {
                const Icon = socialIcons[name];
                return (
                  <li key={name}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      className="flex size-7 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30"
                    >
                      <Icon />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-4 text-xs font-semibold tracking-wide uppercase">
                {column.title}
              </h2>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-3 text-xs">
            <h2 className="text-xs font-semibold">Contact us</h2>
            <div className="flex flex-col gap-1">
              <p className="text-accent">{complaintServices.label}</p>
              <p className="text-white/80">
                {complaintServices.phone} and{" "}
                <a
                  href={`mailto:${complaintServices.email}`}
                  className="hover:text-white"
                >
                  {complaintServices.email}
                </a>
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-accent">{customerService.label}</p>
              <p className="text-white/80">{customerService.phone}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/60 pt-6 text-[11px] text-white/80">
          <p>
            &copy; <CopyrightYear /> {siteConfig.name}
          </p>
          <ul className="flex flex-wrap gap-6">
            {footerLegalLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
