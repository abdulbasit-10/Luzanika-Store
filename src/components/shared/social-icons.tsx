import type { ComponentProps } from "react";

type IconProps = ComponentProps<"svg">;

function SocialSvg(props: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-3.5"
      {...props}
    />
  );
}

export function LinkedInIcon(props: IconProps) {
  return (
    <SocialSvg {...props}>
      <path d="M6.5 9h-3v11h3V9zM5 4a1.75 1.75 0 100 3.5A1.75 1.75 0 005 4zm14 9.5c0-2.6-1.4-4.5-3.9-4.5-1.3 0-2.2.7-2.6 1.4V9h-3v11h3v-6c0-1.5.8-2.4 2-2.4s1.5 1 1.5 2.4v6h3v-6.5z" />
    </SocialSvg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <SocialSvg {...props}>
      <path d="M18.2 3h3.1l-6.8 7.7L22.5 21h-6.2l-4.9-6.4L5.8 21H2.7l7.3-8.3L2.3 3h6.4l4.4 5.9L18.2 3zm-1.1 16.2h1.7L7.7 4.7H5.9l11.2 14.5z" />
    </SocialSvg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <SocialSvg {...props}>
      <path d="M14 8h2V5h-2c-2 0-3.5 1.6-3.5 3.8V11H8v3h2.5v7h3v-7H16l.5-3h-3V9.2c0-.7.3-1.2 1-1.2z" />
    </SocialSvg>
  );
}

/** The four-colour Google "G"; it keeps its brand colours. */
export function GoogleIcon(props: IconProps) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.34v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.36 14.31a7.2 7.2 0 0 1 0-4.62V6.6H1.34a12 12 0 0 0 0 10.8l4.02-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.34 6.6l4.02 3.1A7.2 7.2 0 0 1 12 4.75z"
      />
    </svg>
  );
}

export function AppleIcon(props: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4"
      {...props}
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
    </svg>
  );
}
