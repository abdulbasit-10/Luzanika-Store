"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/utils/cn";

/** One wavy brown stripe of the design: its box, and how far its drawing spills past the box (percent). */
interface Wave {
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  inset: string;
}

// Positions are the design's (a 656 x 1026 panel); `top` counts from the first stripe, so the
// stripes stay glued to the bottom of the panel whatever its height is.
const WAVES: Wave[] = [
  {
    src: "wave-1",
    left: -61,
    top: 0,
    width: 725.5,
    height: 740,
    inset: "-0.39% -0.32% -1.03% -1.03%",
  },
  {
    src: "wave-2",
    left: -97,
    top: 30,
    width: 758,
    height: 754,
    inset: "-0.38% -0.27% -1.02% -0.99%",
  },
  {
    src: "wave-3",
    left: -132,
    top: 62,
    width: 795,
    height: 762,
    inset: "-0.37% -0.24% -1.02% -0.94%",
  },
  {
    src: "wave-4",
    left: -165,
    top: 87,
    width: 779.5,
    height: 764.5,
    inset: "-0.37% -0.37% -0.98% -0.96%",
  },
  {
    src: "wave-5",
    left: -200,
    top: 116,
    width: 726,
    height: 739,
    inset: "-0.39% -0.29% -1.05% -1.03%",
  },
  ...[
    [-230, 145],
    [-258, 175],
    [-289, 199],
    [-317, 229],
    [-344, 257],
    [-376, 286],
    [-404, 313],
  ].map(([left, top]) => ({
    src: "wave-6",
    left,
    top,
    width: 717,
    height: 737,
    inset: "-0.39% -0.32% -1.04% -1.04%",
  })),
];

const ART = "/images/admin";

/** A badge: a white circle holding an icon, like the floating ones in the design. */
function Badge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute flex size-[60px] items-center justify-center rounded-full bg-[#fbfcff] p-2.5 drop-shadow-[0px_16px_8px_rgba(32,24,194,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The dark panel next to the sign-in form. Purely decorative (hidden from
 * screen readers), so it is made of images and one sentence of text.
 */
export function AdminLoginArt({ className }: { className?: string }) {
  const panel = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);

  // The artwork is drawn at 520 x 660 and up; on a smaller panel the whole picture shrinks to fit it.
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min(1, width / 520, height / 660));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      ref={panel}
      aria-hidden
      className={cn(
        "relative hidden overflow-hidden rounded-2xl bg-[#252525] lg:block",
        className,
      )}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-[839px]">
          {WAVES.map((wave, index) => (
            <div
              key={index}
              className="absolute"
              style={{
                left: wave.left,
                top: wave.top,
                width: wave.width,
                height: wave.height,
              }}
            >
              <div className="absolute" style={{ inset: wave.inset }}>
                <Image
                  src={`${ART}/${wave.src}.svg`}
                  alt=""
                  fill
                  unoptimized
                  className="max-w-none"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="absolute top-1/2 left-1/2 size-[395px] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-[-50.63%]">
            <Image
              src={`${ART}/login-glow.svg`}
              alt=""
              fill
              unoptimized
              className="max-w-none"
            />
          </div>
        </div>

        {/* The glass card, centred on the panel; everything inside is placed against its corner, as in the design. */}
        <div className="absolute top-1/2 left-1/2 h-[591px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white/10 backdrop-blur-[10px]">
          <p className="absolute top-[31.5px] left-8 w-[376px] text-[32px] leading-10 font-semibold text-white">
            Securely connect to your account
          </p>

          <div className="absolute top-[143.5px] left-8 h-[233px] w-[303px] rounded-lg shadow-[24px_24px_56px_0px_rgba(11,8,86,0.12)]">
            <Image
              src={`${ART}/login-photo-back.jpg`}
              alt=""
              fill
              sizes="303px"
              className="rounded-lg object-cover"
            />
          </div>
          <div className="absolute top-[223.5px] left-[105px] h-[233px] w-[303px] rounded-lg">
            <Image
              src={`${ART}/login-photo-front.jpg`}
              alt=""
              fill
              sizes="303px"
              className="rounded-lg object-cover"
            />
          </div>

          <Badge className="top-[-30.5px] left-[-30px]">
            <Image
              src={`${ART}/logo.png`}
              alt=""
              width={32}
              height={32}
              className="h-8 w-auto"
            />
          </Badge>
          <Badge className="top-[389.5px] left-8">
            <Image
              src={`${ART}/icon-export.svg`}
              alt=""
              width={24}
              height={24}
              unoptimized
            />
          </Badge>
          <Badge className="top-[560.5px] left-[408px]">
            <span className="text-[32px] leading-10">🤝</span>
          </Badge>

          <p className="absolute top-[476.5px] left-8 w-[381px] text-sm leading-[1.5] text-white">
            It typically displays key metrics, analytics, and important
            information in a visually appealing and easily accessible format,
            allowing administrators.
          </p>
        </div>
      </div>
    </aside>
  );
}
