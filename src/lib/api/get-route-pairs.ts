import { getStations, getTrains } from "./endpoints";
import { ROUTE_DATASET_LIMIT } from "./get-search-results";
import type { CallOptions } from "./http";

export interface RoutePair {
  fromSlug: string;
  toSlug: string;
  fromName: string;
  toName: string;
  /** How many trains run it — the closest thing this dataset has to popularity. */
  trains: number;
}

/**
 * The routes that actually have trains, ordered by how many.
 *
 * Both the sitemap and the hub's internal links are built from this rather than
 * from every combination of stations. Eleven cities make 110 ordered pairs, and
 * a sitemap full of pairs that return nothing is a sitemap full of thin pages.
 */
export async function getRoutePairs(
  options: CallOptions = {},
): Promise<RoutePair[]> {
  const call: CallOptions = {
    cache: "force-cache",
    revalidate: 86_400,
    ...options,
  };

  const [stations, page] = await Promise.all([
    getStations(call),
    getTrains({ limit: ROUTE_DATASET_LIMIT }, call),
  ]);

  // Trains name their endpoints ("Berlin"); URLs use slugs ("berlin").
  const slugByName = new Map(
    stations.map((station) => [station.name, station.slug]),
  );
  const pairs = new Map<string, RoutePair>();

  for (const train of page.data) {
    const fromSlug = slugByName.get(train.from);
    const toSlug = slugByName.get(train.to);
    // A station the directory does not list cannot be linked to.
    if (fromSlug === undefined || toSlug === undefined) continue;

    const key = `${fromSlug}:${toSlug}`;
    const existing = pairs.get(key);

    if (existing === undefined) {
      pairs.set(key, {
        fromSlug,
        toSlug,
        fromName: train.from,
        toName: train.to,
        trains: 1,
      });
    } else {
      existing.trains += 1;
    }
  }

  return [...pairs.values()].sort(
    (a, b) =>
      b.trains - a.trains ||
      a.fromName.localeCompare(b.fromName) ||
      a.toName.localeCompare(b.toName),
  );
}
