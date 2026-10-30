"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import type { FaqItem } from "@/features/faq/faq-items";
import { cn } from "@/utils/cn";

interface FaqAccordionProps {
  items: FaqItem[];
  defaultOpenId?: string;
}

const COLUMN_SPLIT = 3;

export function FaqAccordion({ items, defaultOpenId }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);

  const toggle = (id: string) =>
    setOpenId((current) => (current === id ? null : id));

  // Two independent columns so an expanded card never stretches its neighbour.
  const columns = [items.slice(0, COLUMN_SPLIT), items.slice(COLUMN_SPLIT)];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-8">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-4 lg:gap-8">
          {column.map((item) => (
            <FaqCard
              key={item.id}
              item={item}
              number={items.indexOf(item) + 1}
              open={openId === item.id}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface FaqCardProps {
  item: FaqItem;
  number: number;
  open: boolean;
  onToggle: () => void;
}

function FaqCard({ item, number, open, onToggle }: FaqCardProps) {
  const buttonId = `faq-${item.id}-button`;
  const panelId = `faq-${item.id}-panel`;
  const Icon = open ? X : Plus;

  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-[background-color,box-shadow] duration-300 lg:p-6",
        open
          ? "bg-foreground text-white shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
          : "bg-white text-foreground",
      )}
    >
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full cursor-pointer items-center gap-4 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:gap-6"
        >
          <span
            aria-hidden
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full font-heading text-base transition-colors duration-300 lg:size-[58px] lg:text-xl",
              open ? "bg-white text-foreground" : "bg-foreground text-white",
            )}
          >
            {String(number).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1 text-lg leading-snug font-medium lg:text-2xl">
            {item.question}
          </span>
          <Icon
            aria-hidden
            className={cn("mr-1 size-5 shrink-0 lg:mr-3", open && "self-start")}
            strokeWidth={1.75}
          />
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
          <p className="pt-4 pl-15 font-button text-sm leading-6 text-muted-foreground lg:pr-8 lg:pl-[82px] lg:text-base">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}
