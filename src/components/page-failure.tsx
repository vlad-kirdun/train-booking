import Link from "next/link";

import { describeApiFailure } from "@/lib/api";

/**
 * Server-rendered, unlike `error.tsx`.
 *
 * A React error boundary is a client component: when a Server Component throws,
 * the document arrives with an empty body and the message only appears after
 * hydration — or never, without JavaScript. For a failure we can see coming,
 * that first blank paint is exactly the "looks broken" the brief rules out, so
 * the expected case is rendered here instead and the boundary stays a net for
 * the unexpected.
 */
export function PageFailure({
  error,
  retryHref,
}: {
  error: unknown;
  retryHref: string;
}) {
  const { title, detail, retryable } = describeApiFailure(error);

  return (
    <main
      role="alert"
      className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-16 text-center"
    >
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted text-sm">{detail}</p>
      <p className="text-muted text-sm">
        Your search is still in the address bar, so nothing is lost.
      </p>

      {retryable && (
        <div className="flex flex-wrap justify-center gap-3">
          {/* A plain anchor: a full document request, so it works without
              JavaScript and cannot replay a stale client cache. */}
          <a
            href={retryHref}
            className="bg-foreground text-background flex h-11 items-center rounded-lg px-5 font-medium"
          >
            Try again
          </a>
          <Link
            href="/"
            className="border-border hover:bg-surface flex h-11 items-center rounded-lg border px-5"
          >
            Go to the start
          </Link>
        </div>
      )}
    </main>
  );
}
