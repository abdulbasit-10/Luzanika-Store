import { OptionField } from "@/components/ui/option-field";
import type { ProductColor } from "@/types/product";

interface ColorSwatchesProps {
  colors: ProductColor[];
  /** Selected color name, or null for none. */
  value: string | null;
  onChange: (name: string | null) => void;
  name?: string;
  className?: string;
}

/** Round color picker built on native radios, so arrow keys and screen readers work. */
export function ColorSwatches({
  colors,
  value,
  onChange,
  name = "color",
  className,
}: ColorSwatchesProps) {
  return (
    <OptionField
      legend="Color:"
      hasSelection={value !== null}
      onClear={() => onChange(null)}
      className={className}
    >
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <label key={color.name} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={color.name}
              checked={value === color.name}
              onChange={() => onChange(color.name)}
              className="peer sr-only"
            />
            <span
              title={color.name}
              style={{ backgroundColor: color.hex }}
              className="block size-7 rounded-full ring-1 ring-transparent ring-offset-2 ring-offset-background transition-shadow peer-checked:ring-muted-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring"
            />
            <span className="sr-only">{color.name}</span>
          </label>
        ))}
      </div>
    </OptionField>
  );
}
