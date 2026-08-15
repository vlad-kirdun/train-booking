import Link from "next/link";

import { buildSearchPath, EMPTY_SEARCH_QUERY } from "@/domain/search-query";
import type { RoutePair } from "@/lib/api";

/**
 * Internal links from the hub to the route pages.
 *
 * A query-based URL scheme gives a crawler nothing to follow on its own — there
 * is no path structure to walk. These links are what make the route pages
 * discoverable, and they are phrased the way people search so the anchor text
 * matches the query.
 */
export function PopularRoutes({ pairs }: { pairs: RoutePair[] }) {
  if (pairs.length === 0) return null;

  return (
    <nav aria-labelledby="popular-routes-heading" className="grid gap-3">
      <h2 id="popular-routes-heading" className="font-semibold">
        Popular routes
      </h2>
      <ul className="flex flex-wrap gap-2">
        {pairs.map((pair) => (
          <li key={`${pair.fromSlug}:${pair.toSlug}`}>
            <Link
              href={buildSearchPath({
                ...EMPTY_SEARCH_QUERY,
                from: pair.fromSlug,
                to: pair.toSlug,
              })}
              className="border-border hover:bg-surface inline-block rounded-full border px-3 py-1.5 text-sm"
            >
              {pair.fromName} to {pair.toName} trains
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
