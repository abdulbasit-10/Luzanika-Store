import { SocialLinks } from "@/components/shared/social-links";
import { Section } from "@/components/ui/section";
import { ContactForm } from "@/features/contact/contact-form";
import {
  contactDetails,
  contactForm,
  contactIntro,
  contactSocial,
} from "@/features/contact/contact-content";

/*
 * From lg up this section fills the screen under the short banner, so banner +
 * section are one visible screen, and everything in it scales with
 * --contact-fit (see globals.css): the whole form is visible at any laptop
 * size, Windows scaling or browser zoom. Text and control sizes have a minimum
 * so they stay usable on very short screens.
 * Figma: a white page under the photo banner, and a cream card for the form.
 */
export function ContactSection() {
  return (
    <Section tone="white" className="lg:py-0">
      <div className="lg:flex lg:min-h-[calc(100dvh-var(--header-height)-var(--banner-short))] lg:items-center lg:py-4">
        <div className="grid w-full items-start gap-10 py-16 lg:grid-cols-2 lg:gap-15 lg:py-0">
          <div>
            <h2 className="font-heading text-4xl font-medium lg:text-[max(1.5rem,calc(48*var(--contact-fit)))] lg:leading-tight">
              {contactIntro.title}
            </h2>
            <p className="mt-6 max-w-[37.8rem] text-base text-muted-foreground lg:mt-[calc(32*var(--contact-fit))] lg:text-[max(0.75rem,calc(18.5*var(--contact-fit)))] lg:leading-[1.25]">
              {contactIntro.description}
            </p>

            <ul className="mt-10 flex flex-col gap-3.5 lg:mt-[calc(60*var(--contact-fit))] lg:gap-[calc(14*var(--contact-fit))]">
              {contactDetails.map(({ label, value, icon: Icon, href }) => (
                <li key={label} className="flex items-center gap-3.5">
                  <span
                    aria-hidden
                    className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-foreground text-white lg:size-[max(2.25rem,calc(56*var(--contact-fit)))]"
                  >
                    <Icon
                      className="size-6 lg:size-[max(1rem,calc(24*var(--contact-fit)))]"
                      strokeWidth={1.5}
                    />
                  </span>
                  <div className="min-w-0 text-base font-medium lg:text-[max(0.8125rem,calc(16*var(--contact-fit)))] lg:leading-snug">
                    <p className="text-sm font-normal text-muted-foreground lg:text-[max(0.75rem,calc(14*var(--contact-fit)))]">
                      {label}
                    </p>
                    {href ? (
                      <a href={href} className="break-words hover:underline">
                        {value}
                      </a>
                    ) : (
                      <p>{value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <h2 className="mt-12 font-heading text-4xl font-medium lg:mt-[calc(68*var(--contact-fit))] lg:text-[max(1.5rem,calc(48*var(--contact-fit)))] lg:leading-tight">
              {contactSocial.title}
            </h2>
            <SocialLinks
              variant="contact"
              className="mt-4 lg:mt-[calc(16*var(--contact-fit))]"
            />
          </div>

          <div className="rounded-3xl bg-section p-6 text-foreground lg:px-[max(1.5rem,calc(40*var(--contact-fit)))] lg:py-[calc(48*var(--contact-fit))]">
            <h2 className="text-center font-heading text-3xl font-medium lg:text-[max(1.375rem,calc(44*var(--contact-fit)))] lg:leading-tight">
              {contactForm.title}
            </h2>
            <p className="mx-auto mt-2 max-w-[26rem] text-center text-sm text-muted-foreground lg:mt-[calc(8*var(--contact-fit))] lg:max-w-[max(14rem,calc(416*var(--contact-fit)))] lg:text-[max(0.75rem,calc(18.5*var(--contact-fit)))] lg:leading-[1.25]">
              {contactForm.description}
            </p>
            <div className="mt-6 lg:mt-[calc(28*var(--contact-fit))]">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
