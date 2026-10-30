import { ChevronDown } from "lucide-react";

import type { FaqItem } from "@/features/faq/faq-items";
import { cn } from "@/utils/cn";

interface FaqListItemProps {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}

/** White question card with a chevron; the answer expands below the question. */
export function FaqListItem({ item, open, onToggle }: FaqListItemProps) {
  const buttonId = `faq-item-${item.id}-button`;
  const panelId = `faq-item-${item.id}-panel`;

  return (
    <div className="rounded-lg bg-white px-5 py-5 shadow-[0_2px_4px_rgba(0,0,0,0.08)] lg:px-7 lg:py-7">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span className="min-w-0 font-heading text-lg leading-[1.3] font-medium text-foreground lg:text-2xl">
            {item.question}
          </span>
          <span
            aria-hidden
            className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-section"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-300 motion-reduce:transition-none",
                open && "rotate-180",
              )}
              strokeWidth={2}
            />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="max-w-[44rem] pt-4 text-sm leading-[25px] text-muted-foreground lg:pt-6">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}
