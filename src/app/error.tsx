"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The last-resort net, for a failure that escaped the boundary around the thing
 * that failed — the station directory being unreachable, for instance, which
 * leaves the search form with nothing to offer.
 *
 * Expected failures are handled closer to where they happen, so that a broken
 * results list does not take the form down with it.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Production strips the message from the client, leaving only the digest to
    // correlate with the server log. This is where a real project would report.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        We could not load this page
      </h1>
      <p className="text-muted text-sm">
        The timetable service is not answering right now. Your search is still
        in the address bar, so nothing is lost.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-foreground text-background h-11 rounded-lg px-5 font-medium"
        >
          Try again
        </button>
        <Link
          href="/trains"
          className="border-border hover:bg-surface flex h-11 items-center rounded-lg border px-5"
        >
          Start a new search
        </Link>
      </div>

      {error.digest !== undefined && (
        <p className="text-muted text-xs">Reference: {error.digest}</p>
      )}
    </main>
  );
}
