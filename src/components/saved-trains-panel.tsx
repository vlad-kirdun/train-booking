"use client";

import Link from "next/link";

import { formatDate, formatPrice } from "@/domain/format";
import { buildTrainPath, type SearchQuery } from "@/domain/search-query";
import { unsaveTrain, useSavedTrains } from "@/lib/saved-trains";

/**
 * A pinned block above the results, not a reordering of the list itself.
 *
 * Sorting saved trains to the top would only reorder the page in front of the
 * user: a train saved from page 3 would still not appear on page 1, which is
 * the opposite of what saving it was for. Pinning them here makes the whole
 * shortlist visible from any page of any search.
 */
export function SavedTrainsPanel({ query }: { query: SearchQuery }) {
  const saved = useSavedTrains();

  // Empty on the server and on the first client render, by design — the server
  // cannot know a device's shortlist.
  if (saved.length === 0) return null;

  return (
    <section
      aria-labelledby="saved-trains-heading"
      className="border-border grid gap-3 rounded-xl border border-dashed p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="saved-trains-heading" className="font-semibold">
          Saved trains
        </h2>
        <p className="text-muted text-xs">
          Kept on this device only — signing in is coming later.
        </p>
      </div>

      <ul className="grid gap-2">
        {saved.map((train) => (
          <li
            key={train.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
          >
            <Link
              href={buildTrainPath(train.id, query)}
              className="text-sm underline"
            >
              {train.from} → {train.to}
              <span className="text-muted no-underline">
                {" · "}
                {formatDate(train.departureDate)}, {train.departureTime}
                {" · "}
                {train.trainNumber}
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* The price as it was when saved. Availability is deliberately
                  not remembered — the train's own page has the real figure. */}
              <span className="text-sm font-semibold">
                {formatPrice(train.price)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${train.from} to ${train.to}, ${train.trainNumber}`}
                onClick={() => {
                  unsaveTrain(train.id);
                }}
                className="text-muted text-sm underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
