import { SaveTrainButton } from "@/components/save-train-button";
import { formatFullDate, formatPrice } from "@/domain/format";
import type { Train } from "@/lib/api";

/**
 * Presentation only, so it can be tested: the page around it is an async Server
 * Component and Vitest cannot render those.
 *
 * Unlike the card in the results list, the seat count here is fetched fresh on
 * every request and is presented as the real figure.
 */
export function TrainDetail({ train }: { train: Train }) {
  const soldOut = train.seatsLeft === 0;

  return (
    <article className="grid gap-6">
      <header className="grid gap-2">
        <p className="text-muted text-sm">
          {train.trainNumber} · {train.carriageClass}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {train.from} → {train.to}
        </h1>
        <p className="text-muted">
          <time dateTime={train.departureDate}>
            {formatFullDate(train.departureDate)}
          </time>
        </p>
      </header>

      <dl className="border-border bg-surface grid gap-4 rounded-xl border p-4 sm:grid-cols-3 sm:p-5">
        <div className="grid gap-1">
          <dt className="text-muted text-sm">Departs</dt>
          <dd className="text-lg font-semibold">
            <time dateTime={`${train.departureDate}T${train.departureTime}`}>
              {train.departureTime}
            </time>
          </dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted text-sm">Arrives</dt>
          <dd className="text-lg font-semibold">
            <time dateTime={train.arrivalTime}>{train.arrivalTime}</time>
          </dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted text-sm">Price per seat</dt>
          <dd className="text-lg font-semibold">{formatPrice(train.price)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={soldOut ? "font-medium" : "text-muted"}
          data-testid="availability"
        >
          {soldOut
            ? "This train is fully booked."
            : `${String(train.seatsLeft)} of ${String(train.totalSeats)} seats are available right now.`}
        </p>

        <SaveTrainButton train={train} />
      </div>
    </article>
  );
}
