import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/utils/cn";

interface RangeSliderProps extends Omit<
  ComponentProps<"input">,
  "type" | "value" | "onChange"
> {
  min: number;
  max: number;
  value: number;
  onValueChange: (value: number) => void;
}

/** Single-thumb slider. The filled part of the track is drawn from `--range-progress`. */
export function RangeSlider({
  min,
  max,
  value,
  onValueChange,
  className,
  ...props
}: RangeSliderProps) {
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onValueChange(Number(event.target.value))}
      style={{ "--range-progress": `${progress}%` } as CSSProperties}
      className={cn("range-slider", className)}
      {...props}
    />
  );
}
