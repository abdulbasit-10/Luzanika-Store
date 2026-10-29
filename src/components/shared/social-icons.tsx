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
