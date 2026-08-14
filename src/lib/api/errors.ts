/**
 * Every way a call to the train API can fail, as a closed set.
 *
 * The UI branches on these: `conflict` drives the "not enough seats" recovery
 * flow, `not_found` becomes a 404 page, and the rest share the generic retry
 * screen. Keeping them distinct is what lets those screens differ.
 */
export type ApiErrorKind =
  | "bad_request" // 400 and other client errors we cannot recover from
  | "not_found" // 404
  | "conflict" // 409 — seats were taken between listing and booking
  | "server_error" // 5xx
  | "timeout" // the API did not answer in time
  | "network" // the API could not be reached at all
  | "invalid_response"; // it answered, but not with data we can trust

export interface ApiErrorOptions {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  detail?: string;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  /** Message from the API's own `{ error: string }` body, when it sent one. */
  readonly detail: string | undefined;

  constructor({ kind, message, status, detail, cause }: ApiErrorOptions) {
    super(message, { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.detail = detail;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Only failures that a second attempt could plausibly fix. A 4xx will be a 4xx
 * again, and a response that failed schema validation will fail it again, so
 * retrying either one just makes the user wait longer for the same error.
 */
const RETRYABLE_KINDS: ReadonlySet<ApiErrorKind> = new Set<ApiErrorKind>([
  "network",
  "timeout",
  "server_error",
]);

export function isRetryable(error: ApiError): boolean {
  return RETRYABLE_KINDS.has(error.kind);
}
