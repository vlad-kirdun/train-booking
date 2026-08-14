import Link from "next/link";

import { formatFullDate, formatPrice } from "@/domain/format";
import {
  buildSearchPath,
  type SearchQuery,
  withSearchQuery,
} from "@/domain/search-query";

/**
 * Every dead end offers a way out that undoes one specific filter. "No results"
 * on its own leaves the user to guess which of four inputs is the problem.
 */
export function EmptyResults({ query }: { query: SearchQuery }) {
  const suggestions = [
    query.maxPrice !== undefined && {
      key: "maxPrice",
      label: `Search without the ${formatPrice(query.maxPrice)} budget`,
      href: buildSearchPath(withSearchQuery(query, { maxPrice: undefined })),
    },
    query.date !== undefined && {
      key: "date",
      label: `Search all dates instead of ${formatFullDate(query.date)}`,
      href: buildSearchPath(withSearchQuery(query, { date: undefined })),
    },
  ].filter((suggestion) => suggestion !== false);

  return (
    <div className="border-border grid gap-3 rounded-xl border border-dashed p-6 text-center">
      <p className="font-medium">No trains match this search.</p>

      {suggestions.length === 0 ? (
        <p className="text-muted text-sm">
          Try a different pair of cities for this route.
        </p>
      ) : (
        <ul className="grid gap-2">
          {suggestions.map((suggestion) => (
            <li key={suggestion.key}>
              <Link href={suggestion.href} className="text-sm underline">
                {suggestion.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A page number past the end: the search is fine, the address is just too far along. */
export function EmptyPage({ query }: { query: SearchQuery }) {
  return (
    <div className="border-border grid gap-3 rounded-xl border border-dashed p-6 text-center">
      <p className="font-medium">There is nothing on this page.</p>
      <Link
        href={buildSearchPath(withSearchQuery(query, { page: 1 }))}
        className="text-sm underline"
      >
        Back to the first page of results
      </Link>
    </div>
  );
}
