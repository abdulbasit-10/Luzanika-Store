"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { productsPage } from "@/features/products/products-config";

interface ProductSearchBoxProps {
  /** The search currently applied. The parent remounts the box when it changes. */
  initialQuery: string;
  onSubmit: (query: string) => void;
}

/** White search field with a clear button. Searching happens on Enter, like most shops. */
export function ProductSearchBox({
  initialQuery,
  onSubmit,
}: ProductSearchBoxProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialQuery);

  // The header search icon links to /products#search.
  useEffect(() => {
    if (window.location.hash === "#search") inputRef.current?.focus();
  }, []);

  return (
    <form
      id="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(text.trim());
      }}
      className="relative w-full scroll-mt-[calc(var(--header-height)+1rem)] sm:max-w-[327px]"
    >
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-navy"
        strokeWidth={1.75}
      />
      <input
        id={inputId}
        ref={inputRef}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={productsPage.searchPlaceholder}
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-[10px] bg-white pr-10 pl-11 text-sm text-muted-foreground placeholder:text-muted-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:h-[45px] [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText("");
            onSubmit("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-foreground hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </form>
  );
}
