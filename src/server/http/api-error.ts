/**
 * Every error the API can return. The code is what the website reacts to (and
 * can translate); the message is a safe, human-readable default.
 * Add a code here, with its HTTP status, before using it anywhere.
 */
const ERRORS = {
  bad_request: [400, "The request could not be understood."],
  validation_failed: [400, "Please check the highlighted fields."],
  unauthenticated: [401, "Please sign in to continue."],
  invalid_credentials: [401, "Email or password is incorrect."],
  forbidden: [403, "You do not have permission to do this."],
  csrf_failed: [403, "This request was blocked for your security."],
  two_factor_required: [403, "Two-factor verification is required."],
  not_found: [404, "We could not find what you were looking for."],
  conflict: [409, "This request conflicts with the current state."],
  email_taken: [409, "An account with this email already exists."],
  email_not_registered: [404, "This email is not registered with us."],
  out_of_stock: [409, "This item is out of stock."],
  price_changed: [409, "The price of an item has changed."],
  cart_changed: [409, "Your cart has changed. Please review it and try again."],
  invalid_status_transition: [409, "This status change is not allowed."],
  invalid_reset_link: [410, "This link is invalid or has expired."],
  payload_too_large: [413, "The request is too large."],
  unsupported_media_type: [415, "The request must be sent as JSON."],
  unprocessable: [422, "This request cannot be completed."],
  rate_limited: [429, "Too many requests. Please try again later."],
  internal_error: [500, "Something went wrong on our side."],
  service_unavailable: [
    503,
    "The service is temporarily unavailable. Please try again shortly.",
  ],
} as const;

export type ApiErrorCode = keyof typeof ERRORS;

export interface ApiErrorOptions {
  /** Overrides the default message. Must be safe to show to a customer. */
  message?: string;
  /** Per-field messages for form errors, e.g. { email: "Enter a valid email" }. */
  fields?: Record<string, string>;
  /** Extra response headers, e.g. Retry-After. */
  headers?: Record<string, string>;
  /** The underlying error. It is logged, never sent to the client. */
  cause?: unknown;
}

/** Throw this from any handler or service; the route wrapper turns it into the standard JSON error. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly headers?: Record<string, string>;

  constructor(code: ApiErrorCode, options: ApiErrorOptions = {}) {
    super(options.message ?? ERRORS[code][1], { cause: options.cause });
    this.name = "ApiError";
    this.code = code;
    this.status = ERRORS[code][0];
    this.fields = options.fields;
    this.headers = options.headers;
  }
}
