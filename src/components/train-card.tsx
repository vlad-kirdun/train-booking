import { formatDate, formatPrice } from "@/domain/format";
import type { Train } from "@/lib/api";

/** Below this, the count stops being background information and starts mattering. */
const LOW_AVAILABILITY = 10;

export function TrainCard({ train }: { train: Train }) {
  const soldOut = train.seatsLeft === 0;

  return (
    <article className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold">
          {train.from} → {train.to}
        </h3>
        <p className="text-lg font-semibold">{formatPrice(train.price)}</p>
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

      {/* A snapshot from the cached list, not a promise. The detail page and the
          booking response are the authority on availability. */}
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
    </article>
  );
}
