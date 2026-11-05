"use client";

import { Search } from "lucide-react";
import { useId, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { FaqListItem } from "@/features/faq/faq-list-item";
import {
  faqGroups,
  faqPage,
  type FaqGroup,
} from "@/features/faq/faq-page-content";

const ALL = "all";

/** Open item per group; groups flagged `openFirstByDefault` start with their first question open, as in Figma. */
function initialOpenItems(): Record<string, string | null> {
  return Object.fromEntries(
    faqGroups.map((group) => [
      group.id,
      group.openFirstByDefault ? (group.items[0]?.id ?? null) : null,
    ]),
  );
}

function filterGroups(groups: FaqGroup[], activeId: string, query: string) {
  const needle = query.trim().toLowerCase();

  return groups
    .filter((group) => activeId === ALL || group.id === activeId)
    .map((group) => ({
      ...group,
      items: needle
        ? group.items.filter(({ question, answer }) =>
            `${question} ${answer}`.toLowerCase().includes(needle),
          )
        : group.items,
    }))
    .filter((group) => group.items.length > 0);
}

export function FaqBrowser() {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(ALL);
  const [openItems, setOpenItems] = useState(initialOpenItems);

  const groups = filterGroups(faqGroups, activeId, query);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  const toggle = (groupId: string, itemId: string) =>
    setOpenItems((current) => ({
      ...current,
      [groupId]: current[groupId] === itemId ? null : itemId,
    }));

  const reset = () => {
    setQuery("");
    setActiveId(ALL);
  };

  return (
    <div>
      <div role="search" className="relative">
        <label htmlFor={searchId} className="sr-only">
          Search questions
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-6 size-[18px] -translate-y-1/2 lg:left-[34px]"
          strokeWidth={1.75}
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={faqPage.searchPlaceholder}
          autoComplete="off"
          className="h-12 w-full rounded-3xl bg-section pr-6 pl-14 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:h-14 lg:pl-[71px] [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      <div
        role="group"
        aria-label="Filter by topic"
        className="mt-6 flex flex-wrap gap-3 lg:mt-[52px] lg:gap-[25px]"
      >
        <FilterPill
          active={activeId === ALL}
          onClick={() => setActiveId(ALL)}
          className="px-5 py-[7px] text-sm aria-[pressed=false]:border-accent aria-[pressed=false]:hover:bg-section lg:px-[29px]"
        >
          All Questions
        </FilterPill>
        {faqGroups.map((group) => (
          <FilterPill
            key={group.id}
            active={activeId === group.id}
            onClick={() => setActiveId(group.id)}
            className="px-5 py-[7px] text-sm aria-[pressed=false]:border-accent aria-[pressed=false]:hover:bg-section lg:px-[29px]"
          >
            {group.pillLabel}
          </FilterPill>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {total} {total === 1 ? "question" : "questions"} shown
      </p>

      {groups.length > 0 ? (
        <div className="mt-8 flex flex-col gap-10 lg:mt-12 lg:gap-12">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`faq-group-${group.id}`}>
              <div className="flex items-center justify-between gap-4">
                <h2
                  id={`faq-group-${group.id}`}
                  className="flex items-center gap-2 font-heading text-2xl leading-tight font-medium lg:text-[32px]"
                >
                  <span
                    aria-hidden
                    className="size-[9px] shrink-0 rounded-full bg-[#655d51]"
                  />
                  {group.title}
                </h2>
                <p className="text-xs tracking-wider whitespace-nowrap text-muted-foreground uppercase">
                  {group.items.length}{" "}
                  {group.items.length === 1 ? "question" : "questions"}
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {group.items.map((item) => (
                  <FaqListItem
                    key={item.id}
                    item={item}
                    open={openItems[group.id] === item.id}
                    onToggle={() => toggle(group.id, item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No matching questions"
          description="Try a different keyword or choose another topic."
          action={
            <Button variant="secondary" onClick={reset}>
              Clear search
            </Button>
          }
        />
      )}
    </div>
  );
}
