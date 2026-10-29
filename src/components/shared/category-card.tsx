import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/utils/cn";

interface CategoryCardProps {
  title: string;
  description: string;
  href: string;
  image: { src: string; alt: string };
  /** CSS object-position, used to keep the subject in frame when the photo is cropped. */
  imagePosition?: string;
  sizes: string;
  className?: string;
}

export function CategoryCard({
  title,
  description,
  href,
  image,
  imagePosition = "center",
  sizes,
  className,
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden rounded-xl bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        style={{ objectPosition: imagePosition }}
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-black/65 via-black/10 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
        <div className="flex max-w-[16rem] flex-col gap-1">
          <h3 className="font-heading text-xl font-semibold">{title}</h3>
          <p className="text-xs text-white/80">{description}</p>
        </div>
        <ArrowRight
          aria-hidden
          className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}
