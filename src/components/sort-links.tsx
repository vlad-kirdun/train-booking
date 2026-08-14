import Link from "next/link";

import {
  buildSearchPath,
  type SearchQuery,
  type SortOption,
  withSearchQuery,
} from "@/domain/search-query";

const LABELS: Record<SortOption, string> = {
  price_asc: "Cheapest first",
  price_desc: "Most expensive first",
};

/**
 * Links rather than a select: sorting is a distinct address, so every ordering
 * is shareable, crawlable and reachable with the back button, and it costs no
 * JavaScript.
 */
export function SortLinks({ query }: { query: SearchQuery }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted text-sm">Sort by price</span>
      <div className="border-border flex overflow-hidden rounded-lg border">
        {(Object.keys(LABELS) as SortOption[]).map((option) => {
          const active = query.sort === option;

          return (
            <Link
              key={option}
              href={buildSearchPath(withSearchQuery(query, { sort: option }))}
              aria-current={active ? "true" : undefined}
              className={`px-3 py-2 text-sm ${
                active ? "bg-foreground text-background" : "hover:bg-surface"
              }`}
            >
              {LABELS[option]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
