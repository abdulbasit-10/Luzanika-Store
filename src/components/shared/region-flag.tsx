import type { RegionCode } from "@/types/region";
import { cn } from "@/utils/cn";

export function RegionFlag({
  region,
  className,
}: {
  region: RegionCode;
  /** Replaces the default small rounded rectangle, e.g. `size-6 rounded-full` for a round flag. */
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 16"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-3.5 w-5 shrink-0 rounded-[2px]", className)}
    >
      {region === "PK" ? (
        <>
          <rect width="24" height="16" fill="#01411c" />
          <rect width="6" height="16" fill="#fff" />
          <circle cx="15" cy="8" r="4.5" fill="#fff" />
          <circle cx="16.6" cy="7" r="3.8" fill="#01411c" />
          <polygon
            points="18.6,4 19,5.1 20.1,5.1 19.2,5.8 19.5,6.9 18.6,6.2 17.7,6.9 18,5.8 17.1,5.1 18.2,5.1"
            fill="#fff"
          />
        </>
      ) : (
        <>
          <rect width="24" height="5.34" fill="#000" />
          <rect y="5.33" width="24" height="5.34" fill="#dd0000" />
          <rect y="10.66" width="24" height="5.34" fill="#ffce00" />
        </>
      )}
    </svg>
  );
}
