import Link from "next/link";

import { LinkPendingHint } from "@/components/link-pending-hint";
import { SavedBadge } from "@/components/saved-badge";
import { SaveTrainButton } from "@/components/save-train-button";
import { formatDate, formatPrice } from "@/domain/format";
import { buildTrainPath, type SearchQuery } from "@/domain/search-query";
import type { Train } from "@/lib/api";

/** Below this, the count stops being background information and starts mattering. */
const LOW_AVAILABILITY = 10;

export function TrainCard({
  train,
  query,
}: {
  train: Train;
  query: SearchQuery;
}) {
  const soldOut = train.seatsLeft === 0;

  return (
    <article className="border-border bg-surface focus-within:outline-foreground relative flex flex-col gap-3 rounded-xl border p-4 focus-within:outline-2 focus-within:outline-offset-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold">
          {/* One link, stretched over the card, so the whole thing is a tap
              target without nesting interactive elements inside an anchor —
              which is what lets the save control sit here later. */}
          <Link
            href={buildTrainPath(train.id, query)}
            className="outline-none after:absolute after:inset-0"
          >
            {train.from} → {train.to}
            <span className="sr-only">
              , {train.trainNumber}, {formatDate(train.departureDate)} at{" "}
              {train.departureTime}
            </span>
            <LinkPendingHint />
          </Link>
        </h3>
        <div className="flex items-center gap-2">
          <SavedBadge id={train.id} />
          <p className="text-lg font-semibold">{formatPrice(train.price)}</p>
        </div>
      </div>

      <dl className="text-muted flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="sr-only">Departure</dt>
          <dd>
            <time dateTime={`${train.departureDate}T${train.departureTime}`}>
              {formatDate(train.departureDate)}, {train.departureTime}
            </time>
            {" – "}
            <time dateTime={train.arrivalTime}>{train.arrivalTime}</time>
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="sr-only">Train</dt>
          <dd>{train.trainNumber}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="sr-only">Class</dt>
          <dd>{train.carriageClass}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* A snapshot from the cached list, not a promise. The detail page and
            the booking response are the authority on availability. */}
        <p
          className={
            soldOut || train.seatsLeft < LOW_AVAILABILITY
              ? "text-sm font-medium"
              : "text-muted text-sm"
          }
        >
          {soldOut
            ? "No seats left"
            : `${String(train.seatsLeft)} of ${String(train.totalSeats)} seats left`}
        </p>

        <SaveTrainButton train={train} />
      </div>
    </article>
  );
}
