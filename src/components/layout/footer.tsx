import Link from "next/link";
import { cacheLife } from "next/cache";

import { Logo } from "@/components/shared/logo";
import { SocialLinks } from "@/components/shared/social-links";
import { Container } from "@/components/ui/container";
import { footerColumns, footerLegalLinks } from "@/config/navigation";
import { siteConfig } from "@/config/site";

const linkClass = "transition-opacity hover:opacity-70";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");

  return <>{new Date().getFullYear()}</>;
}

/** `white` is for the signed-in account pages; every other page keeps the grey footer. */
export function Footer({ tone = "grey" }: { tone?: "grey" | "white" }) {
  const { address, email, customerService } = siteConfig.contact;

  return (
    // Figma "Footer": the page's grey background (#D9D9D9), a 1px black line on top, text and icons in #252525.
    <footer
      className={`border-t border-black text-foreground ${tone === "white" ? "bg-surface" : "bg-background"}`}
    >
      <Container className="py-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[481fr_284fr_283fr_max-content] lg:gap-0">
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <Logo className="-mt-1.5" />
            <p className="mt-[3px] max-w-64 text-base">{siteConfig.tagline}</p>
            <SocialLinks variant="footer" className="mt-5" />
          </div>

          {footerColumns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="flex flex-col gap-[9px]"
            >
              <h2 className="text-base font-semibold uppercase">
                {column.title}
              </h2>
              <ul className="flex flex-col gap-[9px]">
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

          <div className="flex flex-col gap-[9px]">
            <h2 className="text-base font-semibold">Contact us</h2>
            <ul className="flex flex-col gap-3">
              <li>Address : {address}</li>
              <li>
                Email :{" "}
                <a href={`mailto:${email}`} className={linkClass}>
                  {email}
                </a>
              </li>
              <li>{customerService.label}</li>
              <li>{customerService.phone}</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-foreground pt-6 text-sm">
          <p>
            &copy; <CopyrightYear /> {siteConfig.name}
          </p>
          <ul className="flex flex-wrap gap-5">
            {footerLegalLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className={linkClass}>
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
