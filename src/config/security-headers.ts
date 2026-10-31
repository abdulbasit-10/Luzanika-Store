export interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

interface Options {
  /** Development needs eval (React debugging), websockets (hot reload) and plain http. */
  isDev: boolean;
}

function policy(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([name, sources]) => [name, ...sources].join(" "))
    .join("; ");
}

/**
 * Policy for the website's pages. The site loads nothing from other origins
 * (images are local, fonts are self-hosted), so every source is 'self'.
 * Inline scripts are allowed because Next.js needs one to start the page;
 * a nonce-based policy would force every page to render per request.
 * When a third party is added (e.g. Stripe), allow only its exact origin
 * in the specific directives that need it.
 */
export function buildContentSecurityPolicy({ isDev }: Options): string {
  return policy({
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(isDev ? ["ws:", "wss:"] : [])],
    "media-src": ["'self'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  });
}

/** API answers are JSON only, so they may load and do nothing at all. */
export function buildApiContentSecurityPolicy(): string {
  return policy({
    "default-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'none'"],
    "frame-ancestors": ["'none'"],
  });
}

export function securityHeaderRules({ isDev }: Options): HeaderRule[] {
  const common = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({ isDev }),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), usb=(), payment=(self)",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    // Browsers ignore HSTS over plain http, but keep it out of development to avoid confusion.
    ...(isDev
      ? []
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ]),
  ];

  return [
    { source: "/:path*", headers: common },
    // Listed last so it replaces the page policy for API routes (the last matching rule wins).
    {
      source: "/api/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: buildApiContentSecurityPolicy(),
        },
      ],
    },
  ];
}
