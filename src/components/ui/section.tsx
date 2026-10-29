import type { ComponentProps } from "react";

import { Container } from "@/components/ui/container";
import { cn } from "@/utils/cn";

type SectionTone = "default" | "cream";

const tones: Record<SectionTone, string> = {
  default: "bg-background",
  cream: "bg-section",
};

export function Section({
  tone = "default",
  className,
  children,
  ...props
}: ComponentProps<"section"> & { tone?: SectionTone }) {
  return (
    <section
      className={cn("py-section lg:py-20", tones[tone], className)}
      {...props}
    >
      <Container>{children}</Container>
    </section>
  );
}
