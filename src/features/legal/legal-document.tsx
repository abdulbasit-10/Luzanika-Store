import { ChartNoAxesColumn, Cookie } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Eyebrow } from "@/components/ui/eyebrow";
import type {
  LegalCard,
  LegalChapter,
  LegalIntro,
  LegalSubsection,
} from "@/features/legal/legal-content";
import { cn } from "@/utils/cn";

const cardIcons: Record<LegalCard["icon"], LucideIcon> = {
  cookie: Cookie,
  chart: ChartNoAxesColumn,
};

/*
 * Long-form legal text, laid out as a single left-aligned column (820px at
 * 1440, as in the Figma). Blocks are spaced 45px apart; sizes follow the
 * Figma (measured on the Privacy Policy frame).
 */
export function LegalDocument({ chapters }: { chapters: LegalChapter[] }) {
  return (
    <div className="flex max-w-[820px] flex-col gap-10 lg:gap-[45px]">
      {chapters.map((chapter) => (
        <ChapterBlocks key={chapter.title} chapter={chapter} />
      ))}
    </div>
  );
}

function ChapterBlocks({ chapter }: { chapter: LegalChapter }) {
  return (
    <>
      <Intro intro={chapter.intro} />
      <div className="flex flex-col gap-5 lg:gap-[25px]">
        <Eyebrow>{chapter.eyebrow}</Eyebrow>
        <h2 className="font-heading text-2xl leading-tight font-bold text-black lg:text-4xl">
          {chapter.title}
        </h2>
        <p className="max-w-[45rem] text-base leading-[1.2] text-muted-foreground lg:text-[18.5px]">
          {chapter.description}
        </p>
      </div>
      {chapter.subsections.map((subsection) => (
        <Subsection key={subsection.number} subsection={subsection} />
      ))}
    </>
  );
}

function Intro({ intro }: { intro: LegalIntro }) {
  return (
    <div className="flex flex-col gap-3 lg:gap-[15px]">
      <Eyebrow>{intro.eyebrow}</Eyebrow>
      <h2 className="max-w-[31rem] font-heading text-3xl leading-tight font-bold text-black lg:text-[43.5px] lg:leading-[1.53]">
        {intro.title}
      </h2>
      <p className="max-w-[43.5rem] text-base leading-[1.2] text-muted-foreground lg:text-[18.5px]">
        {intro.description}
      </p>
    </div>
  );
}

function Subsection({ subsection }: { subsection: LegalSubsection }) {
  const {
    number,
    title,
    size = "sm",
    accent,
    body,
    bullets,
    cards,
  } = subsection;

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        size === "lg" ? "lg:gap-[17px]" : "lg:gap-5",
      )}
    >
      <h3 className="flex items-baseline gap-2">
        <span className="font-heading text-xs text-accent">{number}</span>
        <span
          className={cn(
            "font-heading font-bold",
            size === "lg" ? "text-xl lg:text-2xl" : "text-base",
            accent ? "font-semibold text-accent" : "text-black",
          )}
        >
          {title}
        </span>
      </h3>
      <p className="text-base leading-[1.25] text-muted-foreground">{body}</p>

      {bullets ? (
        <ul className="flex flex-col gap-4 lg:mt-[5px] lg:gap-[17px]">
          {bullets.map(({ label, text }) => (
            <li key={label} className="flex gap-3.5">
              <span
                aria-hidden
                className="mt-2.5 size-[5px] shrink-0 rounded-full bg-accent"
              />
              <p className="text-sm leading-[25px] text-copy">
                <strong className="text-base font-medium text-foreground">
                  {label}
                </strong>{" "}
                {text}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {cards ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:mt-0.5">
          {cards.map((card) => {
            const Icon = cardIcons[card.icon];
            return (
              <article
                key={card.title}
                className="rounded-2xl border border-[#d1c4b8]/30 bg-white px-5 pt-5 pb-6"
              >
                <h4 className="flex items-center gap-2.5 font-heading text-base font-medium text-foreground">
                  <Icon
                    aria-hidden
                    className="size-5 shrink-0"
                    strokeWidth={1.5}
                  />
                  {card.title}
                </h4>
                <p className="mt-2.5 text-sm leading-[21px] text-muted-foreground">
                  {card.text}
                </p>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
