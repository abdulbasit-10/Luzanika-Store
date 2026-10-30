import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function StylistCard() {
  return (
    <aside className="flex flex-col gap-2.5 rounded-md border border-black/10 bg-stylist p-4">
      <h3 className="text-xs font-semibold tracking-wide uppercase">
        Personal Stylist
      </h3>
      <p className="text-xs leading-5 text-muted-foreground">
        Need sizing consultations or bespoke tailoring recommendations?
      </p>
      <Link
        href="/contact"
        className="mt-1 flex items-center justify-between gap-2 text-[10px] font-medium tracking-wide uppercase hover:underline"
      >
        Connect with Maître d&apos;Atelier
        <ArrowRight aria-hidden className="size-3 shrink-0" />
      </Link>
    </aside>
  );
}
