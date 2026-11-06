import { Eyebrow } from "@/components/ui/eyebrow";
import type {
  TermsSection,
  termsConditions,
} from "@/features/legal/terms-content";
import { cn } from "@/utils/cn";

type TermsContent = typeof termsConditions;

/*
 * Terms and Conditions text as a left-aligned column (820px at 1440, as in the
 * Figma). Sizes and spacing were measured on the Figma frame.
 */
export function TermsDocument({ content }: { content: TermsContent }) {
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-10 lg:gap-10">
      <header className="flex flex-col gap-5 lg:gap-[19px]">
        <Eyebrow>{content.eyebrow}</Eyebrow>
        <div className="flex flex-col gap-4 lg:gap-[25px]">
          <h2 className="font-heading text-3xl leading-tight font-bold text-black lg:text-[43.5px]">
            {content.heading}
          </h2>
          <p className="max-w-[42rem] text-base leading-[1.2] text-muted-foreground lg:text-[18.7px]">
            {content.description}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 lg:mt-5 lg:gap-[29px]">
        <h2 className="font-heading text-2xl leading-tight font-bold text-black lg:text-4xl">
          {content.welcome.title}
        </h2>
        <p className="max-w-[45rem] text-base leading-[1.2] text-muted-foreground lg:text-[18.7px]">
          {content.welcome.description}
        </p>
      </div>

      {content.sections.map((section) => (
        <Section key={section.number} section={section} />
      ))}
    </div>
  );
}

function Section({ section }: { section: TermsSection }) {
  const { number, title, size, body, items } = section;
  const large = size === "lg";

  return (
    <section
      aria-labelledby={`terms-${number}`}
      className={cn(
        "flex flex-col gap-4",
        large ? "lg:gap-[17px]" : body ? "lg:gap-[18px]" : "lg:gap-[23px]",
      )}
    >
      <h3
        id={`terms-${number}`}
        className={cn(
          "flex items-baseline gap-2 font-heading text-black",
          large
            ? "text-2xl leading-tight font-medium lg:text-4xl lg:leading-[1.2]"
            : "text-xl leading-8 font-bold lg:text-2xl",
        )}
      >
        <span
          className={cn(
            "font-normal text-accent",
            large ? "text-lg lg:text-xl" : "text-[18px]",
          )}
        >
          {number}
        </span>
        {title}
      </h3>

      {body ? (
        <p className="max-w-[820px] text-base leading-[1.2] text-muted-foreground lg:text-[16.5px]">
          {body}
        </p>
      ) : null}

      {items ? (
        <ul className="flex flex-col gap-4 lg:gap-[23px]">
          {items.map((item) => (
            <li key={item} className="flex gap-[11px] pl-2">
              <span
                aria-hidden
                className="mt-[9.5px] size-[5px] shrink-0 rounded-full bg-muted-foreground"
              />
              <p className="text-base leading-6 text-muted-foreground lg:text-[16.5px]">
                {item}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
