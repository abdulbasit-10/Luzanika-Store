import { LayoutGrid, List } from "lucide-react";

import { cn } from "@/utils/cn";

type View = "grid" | "list";

interface ViewToggleProps {
  value: View;
  onChange: (value: View) => void;
}

const options = [
  { value: "grid", label: "Grid view", icon: LayoutGrid },
  { value: "list", label: "List view", icon: List },
] as const;

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div role="group" aria-label="Product layout" className="flex gap-2">
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(optionValue)}
            className={cn(
              "flex size-10 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-muted",
            )}
          >
            <Icon aria-hidden className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
