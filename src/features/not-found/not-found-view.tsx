import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/*
 * The 404 artwork of the Figma: a big grey "404" with a tall chest of drawers
 * and a broken cabinet laid over it. Everything inside the artwork is placed in
 * percentages of its box (measured on the Figma frame, 830 x 432), so it scales
 * as one picture. The digits are text (cqw = a share of the artwork's width).
 * The photos are stretched into their boxes, exactly as the Figma does.
 */

/** The 404 page content, without the header and footer (the callers add them when they are missing). */
export function NotFoundView() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-white px-gutter py-6 text-center">
      <div
        aria-hidden
        className="@container relative aspect-[830/432] w-[min(100%,52rem,calc((100dvh-var(--header-height)-15rem)*1.92))]"
      >
        <span className="absolute inset-x-0 top-[-2%] block text-center text-[48.5cqw] leading-none font-black tracking-tighter text-[#8e8e8e] select-none">
          404
        </span>
        <div className="absolute top-[14.8%] left-[7.2%] h-[68.6%] w-[22.85%] -rotate-[2.63deg]">
          <Image
            src="/images/not-found/cabinet.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 200px, 25vw"
            className="object-fill"
          />
        </div>
        <div className="absolute top-[44.7%] left-1/2 h-[55.3%] w-[30.6%]">
          <Image
            src="/images/not-found/broken-box.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 260px, 31vw"
            className="object-fill"
          />
        </div>
      </div>

      <h1 className="-mt-[2.5dvh] font-heading text-[clamp(1.75rem,6.4dvh,3.5rem)] leading-tight font-medium text-foreground uppercase">
        Page not found
      </h1>
      <p className="mt-[clamp(0.5rem,3dvh,2rem)] text-[clamp(0.875rem,2.3dvh,1.25rem)] font-medium text-muted-foreground">
        Sorry, we can not find the page you are looking for.
      </p>
      <Link
        href="/"
        className="mt-[clamp(0.75rem,3dvh,2rem)] flex items-center gap-2 text-[clamp(1rem,2.8dvh,1.5rem)] font-semibold text-foreground uppercase hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden className="size-[1em]" strokeWidth={1.75} />
        Back to home
      </Link>
    </main>
  );
}
