"use client";

import { useLinkStatus } from "next/link";

/**
 * Feedback for a tap that has not resolved yet.
 *
 * The train page deliberately has no `loading.tsx`: a loading file makes the
 * route stream, and once the shell has flushed the response status is already
 * 200 — so a withdrawn train would answer a crawler with a working page instead
 * of a 404. Without that streaming boundary the browser sits on the old page
 * while the uncached request runs, which on a phone reads as a dead tap. This
 * fills the gap: an inline pending mark, no streaming, correct status.
 *
 * Must be rendered inside the `<Link>` whose state it reports.
 */
export function LinkPendingHint() {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <span
      role="status"
      className="border-muted ml-2 inline-block size-3 animate-spin rounded-full border-2 border-t-transparent align-middle"
    >
      <span className="sr-only">Opening…</span>
    </span>
  );
}
