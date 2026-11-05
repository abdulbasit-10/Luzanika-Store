import type { ComponentProps } from "react";

import { Container } from "@/components/ui/container";
import { cn } from "@/utils/cn";

type SectionTone = "default" | "white" | "cream";

const tones: Record<SectionTone, string> = {
  // default is the page grey (#D9D9D9); white and cream are the other two section colours of the Figma.
  default: "bg-background",
  white: "bg-white",
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
