import { buildSearchPath, type SearchQuery } from "@/domain/search-query";
import { describeApiFailure } from "@/lib/api";

interface ResultsErrorProps {
  error: unknown;
  query: SearchQuery;
}

/**
 * Failing results replace the list, not the page. The search form above stays
 * on screen and usable, so the user can retry or change the search rather than
 * being dropped onto an error screen and losing what they typed.
 */
export function ResultsError({ error, query }: ResultsErrorProps) {
  const { title, detail, retryable } = describeApiFailure(error);

  return (
    <div
      role="alert"
      className="border-border grid gap-3 rounded-xl border border-dashed p-6 text-center"
    >
      <p className="font-medium">{title}</p>
      <p className="text-muted text-sm">{detail}</p>

      {retryable && (
        // A plain anchor, not a router call: it re-requests the document, so it
        // works with JavaScript disabled and cannot replay a stale client cache.
        <a
          href={buildSearchPath(query)}
          className="border-border hover:bg-surface mx-auto w-fit rounded-lg border px-4 py-2 text-sm"
        >
          Try again
        </a>
      )}
    </div>
  );
}
