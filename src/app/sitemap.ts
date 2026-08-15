import type { MetadataRoute } from "next";

import { buildSearchPath, EMPTY_SEARCH_QUERY } from "@/domain/search-query";
import { getRoutePairs } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";

/**
 * Built from routes that actually run trains, not from every pair of stations.
 *
 * Individual trains are left out on purpose: they are transient inventory, and
 * listing them would fill the index with URLs that stop existing.
 */
/**
 * Rendered per request so `SITE_URL` is read at runtime rather than baked in at
 * build time. The upstream call behind `getRoutePairs` is still cached for a
 * day, so this costs a render, not a request.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pairs = await getRoutePairs().catch(() => []);

  return [
    { url: absoluteUrl("/"), priority: 0.5 },
    { url: absoluteUrl("/trains"), priority: 1 },
    ...pairs.map((pair) => ({
      url: absoluteUrl(
        buildSearchPath({
          ...EMPTY_SEARCH_QUERY,
          from: pair.fromSlug,
          to: pair.toSlug,
        }),
      ),
      priority: 0.8,
    })),
  ];
}
