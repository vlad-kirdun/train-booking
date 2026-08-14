import type { ZodType } from "zod";

import { getApiBaseUrl } from "./config";
import { ApiError, type ApiErrorKind, isRetryable } from "./errors";
import { apiErrorBodySchema } from "./schemas";

export type QueryValue = string | number | undefined | null;

export interface RetryPolicy {
  /** Extra attempts after the first one. */
  attempts?: number;
  /** First backoff pause; each further attempt doubles it. */
  baseDelayMs?: number;
}

/** Caller-facing knobs, shared by every endpoint wrapper. */
export interface CallOptions {
  cache?: RequestCache;
  revalidate?: number | false;
  tags?: string[];
  timeoutMs?: number;
  retry?: RetryPolicy;
  signal?: AbortSignal;
}

export interface RequestOptions<T> extends CallOptions {
  path: string;
  schema: ZodType<T>;
  method?: "GET" | "POST";
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** The upstream cold-starts in a couple of seconds; this leaves room for that. */
export const DEFAULT_TIMEOUT_MS = 8_000;
export const DEFAULT_RETRY_ATTEMPTS = 2;
export const DEFAULT_RETRY_BASE_DELAY_MS = 250;

/**
 * Performs a request, validates the body against `schema`, and turns every
 * failure into an `ApiError`. Retries are applied to `GET` only — replaying a
 * `POST /bookings` could book a second set of seats.
 */
export async function apiRequest<T>(options: RequestOptions<T>): Promise<T> {
  const isIdempotent = (options.method ?? "GET") === "GET";
  const attempts = isIdempotent
    ? (options.retry?.attempts ?? DEFAULT_RETRY_ATTEMPTS)
    : 0;
  const baseDelayMs = options.retry?.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await performRequest(options);
    } catch (error) {
      const exhausted = attempt >= attempts;
      if (!(error instanceof ApiError) || exhausted || !isRetryable(error)) {
        throw error;
      }
      await delay(baseDelayMs * 2 ** attempt);
    }
  }
}

async function performRequest<T>({
  path,
  schema,
  method = "GET",
  query,
  body,
  cache,
  revalidate,
  tags,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal: callerSignal,
}: RequestOptions<T>): Promise<T> {
  const url = buildUrl(path, query);
  const response = await send({
    url,
    method,
    body,
    cache,
    revalidate,
    tags,
    timeoutMs,
    callerSignal,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new ApiError({
      kind: statusToKind(response.status),
      status: response.status,
      detail,
      message: `${method} ${url} failed with ${String(response.status)}${
        detail === undefined ? "" : `: ${detail}`
      }`,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiError({
      kind: "invalid_response",
      status: response.status,
      message: `${method} ${url} returned a body that is not valid JSON`,
      cause: error,
    });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError({
      kind: "invalid_response",
      status: response.status,
      message: `${method} ${url} returned data that does not match the expected schema`,
      cause: parsed.error,
    });
  }

  return parsed.data;
}

interface SendOptions {
  url: string;
  method: "GET" | "POST";
  body: unknown;
  cache: RequestCache | undefined;
  revalidate: number | false | undefined;
  tags: string[] | undefined;
  timeoutMs: number;
  callerSignal: AbortSignal | undefined;
}

async function send({
  url,
  method,
  body,
  cache,
  revalidate,
  tags,
  timeoutMs,
  callerSignal,
}: SendOptions): Promise<Response> {
  // A dedicated controller rather than `AbortSignal.timeout`, so that a timeout
  // stays distinguishable from the caller cancelling the request.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => {
    controller.abort();
  };
  callerSignal?.addEventListener("abort", forwardAbort);

  try {
    return await fetch(url, {
      method,
      signal: controller.signal,
      ...(body === undefined
        ? {}
        : {
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          }),
      ...(cache === undefined ? {} : { cache }),
      ...(revalidate === undefined && tags === undefined
        ? {}
        : { next: { revalidate, tags } }),
    });
  } catch (error) {
    // A caller-driven abort is a deliberate cancellation, not an API failure:
    // pass it through untouched so callers can tell the two apart.
    if (callerSignal?.aborted === true) {
      throw error;
    }
    throw new ApiError({
      kind: timedOut ? "timeout" : "network",
      message: timedOut
        ? `${method} ${url} timed out after ${String(timeoutMs)}ms`
        : `${method} ${url} could not reach the API`,
      cause: error,
    });
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", forwardAbort);
  }
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${getApiBaseUrl()}${path}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function statusToKind(status: number): ApiErrorKind {
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status >= 500) return "server_error";
  return "bad_request";
}

/** Best effort: an error body that is missing or malformed must not mask the status. */
async function readErrorDetail(
  response: Response,
): Promise<string | undefined> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return undefined;
  }

  const parsed = apiErrorBodySchema.safeParse(payload);
  return parsed.success ? parsed.data.error : undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
