import {
  AppWindow,
  AtSign,
  Check,
  Clock,
  Compass,
  Globe,
  LayoutGrid,
  List,
  Lock,
  Shield,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { ButtonLink, buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { siteConfig } from "@/config/site";
import {
  clientSupport,
  cookieFeatureCards,
  cookieIndex,
  cookieTypes,
  cookieUses,
  cookiesPolicy,
  managePreferences,
  moreInformation,
  policyUpdates,
  retention,
  thirdPartyCookies,
} from "@/features/cookies/cookie-content";
import { CookiePreferences } from "@/features/cookies/cookie-preferences";
import { cn } from "@/utils/cn";

const PRIVACY_EMAIL = "privacy@luzanika.com";

const featureIcons: Record<
  (typeof cookieFeatureCards)[number]["icon"],
  LucideIcon
> = {
  lock: Lock,
  sliders: SlidersHorizontal,
};

const browserIcons: LucideIcon[] = [Compass, Globe, AppWindow, LayoutGrid];

const bodyText = "text-base leading-[1.3] text-muted-foreground";
const darkButton =
  "rounded-sm px-5 py-3 text-[10px] tracking-[0.12em] uppercase";

/*
 * Cookies Policy text as a left-aligned column (820px at 1440), laid out like
 * the Privacy and Terms pages. The content comes from the Figma frame.
 */
export function CookiesDocument() {
  const { welcome } = cookiesPolicy;

  return (
    <div className="flex max-w-[820px] flex-col gap-10">
      <header className="flex flex-col gap-4 lg:gap-5">
        <Eyebrow>{cookiesPolicy.eyebrow}</Eyebrow>
        <h2 className="font-heading text-3xl leading-tight font-bold text-black lg:text-[43.5px]">
          {cookiesPolicy.heading}
        </h2>
        <p className="max-w-[42rem] text-base leading-[1.3] text-muted-foreground lg:text-[18.7px]">
          {cookiesPolicy.description}
        </p>
        <p className="flex w-fit items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs text-muted-foreground">
          <Clock aria-hidden className="size-3.5" />
          Last updated: {cookiesPolicy.lastUpdated} • Version{" "}
          {cookiesPolicy.version}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-2xl leading-tight font-bold text-black lg:text-4xl">
          {welcome.title}
        </h2>
        <p className="max-w-[45rem] text-base leading-[1.3] text-muted-foreground lg:text-[18.7px]">
          {welcome.description}
        </p>
      </div>

      <nav
        aria-label="Cookies policy sections"
        className="rounded-xl bg-white p-4"
      >
        <p className="flex items-center gap-2 text-[10px] font-medium tracking-[0.12em] uppercase">
          <List aria-hidden className="size-3.5" />
          Index &amp; quick navigation
        </p>
        <ol className="mt-3 flex flex-wrap gap-2">
          {cookieIndex.map(({ id, label }, index) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="block rounded-md bg-muted px-3 py-1.5 text-xs text-copy hover:bg-border focus-visible:outline-2 focus-visible:outline-ring"
              >
                {index + 1}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <PolicySection
        id="what-are-cookies"
        number="1."
        title="What Are Cookies?"
      >
        <p className={bodyText}>
          Cookies are small text files stored safely on your device when you
          visit a website. They help websites remember information about your
          visit and preferences—such as your localized currency, selected size
          guides, and active sessions—ensuring your return is seamless and
          attuned to your taste.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {cookieFeatureCards.map((card) => {
            const Icon = featureIcons[card.icon];
            return (
              <article key={card.title} className="rounded-xl bg-white p-4">
                <h4 className="flex items-center gap-2 font-heading text-base font-medium">
                  <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                  {card.title}
                </h4>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  {card.text}
                </p>
              </article>
            );
          })}
        </div>
      </PolicySection>

      <PolicySection
        id="how-we-use-cookies"
        number="2."
        title="How We Use Cookies"
      >
        <p className={bodyText}>
          Luzanika employs telemetry solely to enhance and safeguard your
          shopping journey. We may use cookies to:
        </p>
        <ul className="flex flex-col gap-3.5 rounded-xl bg-white p-5">
          {cookieUses.map((use) => (
            <li key={use} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-panel text-accent"
              >
                <Check className="size-2.5" strokeWidth={3} />
              </span>
              <p className="text-sm leading-5 text-foreground">{use}</p>
            </li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection
        id="types-of-cookies"
        number="3."
        title="Types of Cookies We Use"
      >
        <p className={bodyText}>
          Our digital architecture differentiates between four distinct
          classifications of cookies:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {cookieTypes.map((type) => (
            <article
              key={type.key}
              className="flex flex-col rounded-xl bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-heading text-base font-medium">
                  {type.title}
                </h4>
                <span
                  className={cn(
                    "shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-semibold",
                    type.badge === "Always Active"
                      ? "bg-panel text-accent"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {type.badge}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {type.text}
              </p>
              <p className="mt-auto w-fit rounded-sm bg-muted px-2 py-1 text-[9px] text-muted-foreground">
                {type.tag}
              </p>
            </article>
          ))}
        </div>
        <CookiePreferences />
      </PolicySection>

      <PolicySection
        id="third-party-cookies"
        number="4."
        title="Third-Party Cookies"
      >
        <p className={bodyText}>{thirdPartyCookies.body}</p>
        <div className="rounded-xl bg-panel p-4">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white"
            >
              <Shield className="size-4" strokeWidth={1.5} />
            </span>
            <div>
              <h4 className="text-xs font-semibold">
                {thirdPartyCookies.noteTitle}
              </h4>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                {thirdPartyCookies.note}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {thirdPartyCookies.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-sm bg-white px-2 py-1 text-[9px] text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </PolicySection>

      <PolicySection
        id="managing-preferences"
        number="5."
        title="Managing Your Cookie Preferences"
      >
        <p className={bodyText}>{managePreferences.body}</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {managePreferences.browsers.map((browser, index) => {
            const Icon = browserIcons[index];
            return (
              <li key={browser.name}>
                <a
                  href={browser.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-full flex-col items-center gap-1.5 rounded-md bg-white px-3 py-3 text-[10px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                  {browser.name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            );
          })}
        </ul>
        <a
          href="#cookie-preferences"
          className={buttonStyles({
            variant: "secondary",
            className:
              "w-fit rounded-sm border-0 bg-black/[0.06] px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase hover:bg-black/10",
          })}
        >
          <SlidersHorizontal aria-hidden className="size-3" />
          Open preferences panel
        </a>
      </PolicySection>

      <PolicySection id="retention" number="6." title="Cookie Retention">
        <p className={bodyText}>{retention}</p>
      </PolicySection>

      <PolicySection
        id="policy-updates"
        number="7."
        title="Updates to This Policy"
      >
        <p className={bodyText}>{policyUpdates}</p>
      </PolicySection>

      <PolicySection id="client-support" number="8." title="Contact Us">
        <p className={bodyText}>{clientSupport.body}</p>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-md bg-muted"
            >
              <AtSign className="size-4" strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
                {clientSupport.officerLabel}
              </p>
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="text-sm font-medium hover:underline"
              >
                {PRIVACY_EMAIL}
              </a>
            </div>
          </div>
          <ButtonLink href="/contact" className={darkButton}>
            Inquire via concierge
          </ButtonLink>
        </div>
      </PolicySection>

      <aside className="flex flex-wrap items-center justify-between gap-5 rounded-xl bg-white p-5 lg:p-6">
        <div className="max-w-sm">
          <p className="text-[9px] tracking-[0.15em] text-muted-foreground uppercase">
            {moreInformation.eyebrow}
          </p>
          <h2 className="mt-1.5 font-heading text-2xl leading-tight font-medium">
            {moreInformation.title}
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {moreInformation.text}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ButtonLink href="/contact" className={darkButton}>
            Contact us
          </ButtonLink>
          <a
            href={`tel:${siteConfig.contact.customerService.phone.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-2 rounded-sm bg-muted px-3 py-2.5 text-[10px] text-copy hover:bg-border focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            {siteConfig.contact.customerService.phone}
          </a>
        </div>
      </aside>
    </div>
  );
}

function PolicySection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-24 flex-col gap-4 lg:gap-[18px]"
    >
      <h3
        id={`${id}-title`}
        className="flex items-baseline gap-2 font-heading text-xl leading-8 font-bold text-black lg:text-2xl"
      >
        <span className="text-[18px] font-normal text-accent">{number}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
