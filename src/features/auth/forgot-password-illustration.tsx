import type { ComponentProps } from "react";

/** Flat illustration for the reset password page: a person puzzling over a password. Decorative. */
export function ForgotPasswordIllustration(props: ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 260 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M150 138c-4-40 18-72 52-86-1 38-16 72-52 86z" fill="#f1f1f1" />
      <path d="M142 150c2-24 14-42 34-52-1 24-10 42-34 52z" fill="#fafafa" />

      <path
        d="M66 170v-38c0-20 15-30 38-30s38 10 38 30v38H66z"
        fill="#2f2e41"
      />
      <path d="M94 104l10 14 10-14" stroke="#4a4963" strokeWidth="3" />
      <rect x="96" y="82" width="16" height="18" rx="6" fill="#a0616a" />
      <circle cx="104" cy="66" r="22" fill="#2f2e41" />
      <ellipse cx="127" cy="70" rx="4" ry="6" fill="#a0616a" />
      <path d="M84 60c4-12 14-18 26-16-2 10-12 18-26 16z" fill="#3f3d56" />

      <text
        x="118"
        y="34"
        fill="#4c6ef5"
        fontSize="26"
        fontWeight="700"
        fontFamily="Georgia, serif"
      >
        ?
      </text>

      <rect x="132" y="49" width="108" height="26" rx="13" fill="#00000010" />
      <rect x="130" y="46" width="108" height="26" rx="13" fill="#ffffff" />
      {[152, 172, 192, 212].map((cx) => (
        <circle key={cx} cx={cx} cy="59" r="4" fill="#4c6ef5" />
      ))}
      <path d="M142 72l-6 10 14-6" fill="#ffffff" />
    </svg>
  );
}
