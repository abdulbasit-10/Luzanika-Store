"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/utils/cn";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  triggerLabel?: string;
  align?: "start" | "end";
  triggerClassName?: string;
  panelClassName?: string;
}

/** Click-to-open menu that closes on selection, outside click and Escape. */
export function Dropdown({
  trigger,
  children,
  triggerLabel,
  align = "start",
  triggerClassName,
  panelClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open ? (
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute top-full z-50 mt-2 min-w-40 rounded-lg bg-surface py-2 shadow-overlay",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
