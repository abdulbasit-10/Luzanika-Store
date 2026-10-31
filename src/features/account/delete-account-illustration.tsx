import type { ComponentProps } from "react";

/** Flat illustration for the delete account dialog: a person dropping a document into a bin. Decorative. */
export function DeleteAccountIllustration(props: ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 270 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M8 132h254" stroke="#3f3d56" strokeWidth="2" />

      <path
        d="M20 132c0-10 7-16 16-16 3-9 14-12 22-7 8-5 19 1 19 11 4 1 7 5 7 12H20z"
        fill="#ececec"
      />
      <path
        d="M62 132c0-7 5-11 11-11 2-6 10-8 15-5 6-1 11 4 10 10 3 1 5 3 5 6H62z"
        fill="#f4f4f4"
      />

      <rect
        x="164"
        y="88"
        width="42"
        height="44"
        rx="3"
        fill="#f2f2f2"
        stroke="#3f3d56"
        strokeWidth="2"
      />
      <path
        d="M174 96v28M185 96v28M196 96v28"
        stroke="#3f3d56"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g transform="rotate(-24 196 74)">
        <rect
          x="170"
          y="66"
          width="46"
          height="9"
          rx="3"
          fill="#f2f2f2"
          stroke="#3f3d56"
          strokeWidth="2"
        />
        <circle
          cx="213"
          cy="62"
          r="6"
          fill="none"
          stroke="#3f3d56"
          strokeWidth="2"
        />
      </g>

      <path d="M98 132v-36h8l4 36z" fill="#2f2e41" />
      <path d="M112 132l-2-36h12l6 36z" fill="#2f2e41" />
      <path d="M94 133h14v4H94zM116 133h14v4h-14z" fill="#3f3d56" />
      <path
        d="M92 60c0-6 5-10 12-10h6c8 0 13 4 13 11v36H92V60z"
        fill="#a8a8b3"
      />
      <path d="M92 94h31v6H92z" fill="#2f2e41" />
      <rect x="102" y="40" width="9" height="12" rx="4" fill="#a0616a" />
      <circle cx="106" cy="33" r="12" fill="#a0616a" />
      <path
        d="M94 31c0-9 6-14 13-14s12 5 12 12c-6-1-9-4-10-8-3 6-9 9-15 10z"
        fill="#2f2e41"
      />

      <path
        d="M122 64l18 14"
        stroke="#a8a8b3"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="141" cy="79" r="4.5" fill="#a0616a" />
      <g transform="rotate(14 150 88)">
        <rect x="138" y="70" width="22" height="30" rx="2" fill="#e5383b" />
        <path
          d="M143 78h12M143 84h12M143 90h8"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
