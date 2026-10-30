import { OptionField } from "@/components/ui/option-field";

interface SizeSelectorProps {
  sizes: string[];
  value: string | null;
  onChange: (size: string | null) => void;
  name?: string;
  className?: string;
}

/** Size chips built on native radios, so arrow keys and screen readers work. */
export function SizeSelector({
  sizes,
  value,
  onChange,
  name = "size",
  className,
}: SizeSelectorProps) {
  return (
    <OptionField
      legend="Size:"
      hasSelection={value !== null}
      onClear={() => onChange(null)}
      className={className}
    >
      <div className="flex flex-wrap gap-3">
        {sizes.map((size) => (
          <label key={size} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={size}
              checked={value === size}
              onChange={() => onChange(size)}
              className="peer sr-only"
            />
            <span className="flex h-8 min-w-10 items-center justify-center border border-transparent bg-white/30 px-3 text-xs text-foreground/80 transition-colors peer-checked:border-primary peer-checked:bg-transparent peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-white/50">
              {size}
            </span>
          </label>
        ))}
      </div>
    </OptionField>
  );
}
