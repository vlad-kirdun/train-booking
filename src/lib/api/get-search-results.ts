import type { SearchQuery } from "@/domain/search-query";
import {
  buildSearchResults,
  type SearchResults,
} from "@/domain/search-results";

import { getTrains } from "./endpoints";
import type { CallOptions } from "./http";

/**
 * The API has no price filter, so the budget has to be applied on our side —
 * which means we need the whole route's trains, not one upstream page.
 *
 * This is sound only because the dataset is tiny: 141 trains overall, at most
 * around 18 for a single route. It is documented in the README as a scaling
 * caveat; a real catalogue would need `maxPrice` supported upstream.
 */
export const ROUTE_DATASET_LIMIT = 1000;

/**
 * The results list is a browsing surface, so a short cache is a fair trade: it
 * is also what absorbs the slow upstream. Seat counts shown here are a
 * snapshot; the detail page and the booking response are the authority.
 */
export const SEARCH_CACHE_SECONDS = 60;

/** Lets a completed booking expire the lists that showed the old seat count. */
export const TRAINS_CACHE_TAG = "trains";

export async function getSearchResults(
  query: SearchQuery,
  options: CallOptions = {},
): Promise<SearchResults> {
  const response = await getTrains(
    {
      from: query.from,
      to: query.to,
      date: query.date,
      // Deliberately no sortBy: we paginate locally, so we must order locally
      // too, and asking the upstream to sort as well would just be a second
      // opinion we ignore.
      limit: ROUTE_DATASET_LIMIT,
    },
    {
      // Caching is opt-in since Next 16 — without force-cache this becomes an
      // upstream call on every render, which is the opposite of what a slow
      // API needs.
      cache: "force-cache",
      revalidate: SEARCH_CACHE_SECONDS,
      tags: [TRAINS_CACHE_TAG],
      ...options,
    },
  );

  if (response.total > response.data.length) {
    // Filtering a truncated dataset would quietly show the wrong cheapest
    // train, and the user would have no way to notice. Failing here surfaces
    // as the retryable error screen instead.
    throw new Error(
      `The API reported ${String(response.total)} trains for this search but returned ${String(
        response.data.length,
      )}. Budget filtering and pagination run locally over the full route dataset, so a truncated response would produce wrong results. Support maxPrice upstream before the catalogue grows past ${String(ROUTE_DATASET_LIMIT)} trains.`,
    );
  }

  return buildSearchResults(response.data, query);
}
