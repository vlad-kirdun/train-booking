import type { RequestHandler } from "msw";

/**
 * Default handlers applied to every test run.
 *
 * Kept empty on purpose: each suite registers the responses it needs with
 * `server.use(...)`, so a test can never silently depend on another suite's
 * fixture. `onUnhandledRequest: "error"` in the setup file turns any request
 * without an explicit handler into a failure rather than a real network call.
 */
export const handlers: RequestHandler[] = [];
