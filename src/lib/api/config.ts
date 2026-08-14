/**
 * Public assignment API. Used when `TRAIN_API_BASE_URL` is not set so that the
 * project runs with `npm ci && npm run dev` and no configuration step.
 */
export const DEFAULT_API_BASE_URL =
  "https://train-booking-assignment.onrender.com";

/**
 * Server-side only. The value is deliberately not exposed through a
 * `NEXT_PUBLIC_` variable — nothing in the browser talks to the API directly.
 */
export function getApiBaseUrl(): string {
  const configured = process.env.TRAIN_API_BASE_URL?.trim();
  const baseUrl =
    configured === undefined || configured === ""
      ? DEFAULT_API_BASE_URL
      : configured;

  // Trailing slashes would produce `//trains` once a path is appended.
  return baseUrl.replace(/\/+$/, "");
}
