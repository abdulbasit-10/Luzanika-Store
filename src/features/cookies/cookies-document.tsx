import {
  AppWindow,
  Compass,
  Globe,
  LayoutGrid,
  Lock,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import {
  cookieFeatureCards,
  cookieUses,
  cookiesPolicy,
  managePreferences,
  policyUpdates,
  retention,
} from "@/features/cookies/cookie-content";
import { CookiePreferences } from "@/features/cookies/cookie-preferences";

const featureIcons: Record<
  (typeof cookieFeatureCards)[number]["icon"],
  LucideIcon
> = {
  lock: Lock,
  sliders: SlidersHorizontal,
};

const browserIcons: LucideIcon[] = [Compass, Globe, AppWindow, LayoutGrid];

const bodyText = "text-base leading-[1.3] text-muted-foreground";

/*
 * Cookies Policy text as one centred column (820px at 1440), laid out like the
 * Privacy and Terms pages. The five numbered sections follow the Figma frame.
 * Section 3 also holds the working cookie preference switches and the browser
 * links, because its text points to "our on-site settings panel".
 */
export function CookiesDocument() {
  const { welcome } = cookiesPolicy;

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-10">
      <header className="flex flex-col gap-4 lg:gap-5">
        <Eyebrow>{cookiesPolicy.eyebrow}</Eyebrow>
        <h2 className="font-heading text-3xl leading-tight font-bold text-black lg:text-[43.5px]">
          {cookiesPolicy.heading}
        </h2>
        <p className="max-w-[42rem] text-base leading-[1.3] text-muted-foreground lg:text-[18.7px]">
          {cookiesPolicy.description}
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
              <article
                key={card.title}
                className="rounded-2xl border border-[#d1c4b8]/30 bg-white p-5"
              >
                <h4 className="flex items-center gap-2 font-heading text-base font-medium">
                  <Icon aria-hidden className="size-5" strokeWidth={1.5} />
                  {card.title}
                </h4>
                <p className="mt-2 text-sm leading-[22px] text-muted-foreground">
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
        <ul className="flex flex-col gap-4">
          {cookieUses.map((use) => (
            <li key={use} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-2.5 size-[5px] shrink-0 rounded-full bg-muted-foreground"
              />
              <p className={bodyText}>{use}</p>
            </li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection
        id="managing-preferences"
        number="3."
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
                  className="flex h-full flex-col items-center gap-1.5 rounded-md border border-[#d1c4b8]/30 bg-white px-3 py-3 text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                  {browser.name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            );
          })}
        </ul>
        <CookiePreferences />
      </PolicySection>

      <PolicySection
        id="retention"
        number="4."
        title="How Long Cookies Stay on Your Device"
      >
        <p className={bodyText}>{retention}</p>
      </PolicySection>

      <PolicySection
        id="policy-updates"
        number="5."
        title="Updates to This Policy"
      >
        <p className={bodyText}>{policyUpdates}</p>
      </PolicySection>
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
