"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { formatPrice } from "@/domain/format";
import { type BookingState, bookSeats } from "@/lib/actions/book-seats";

interface BookingFormProps {
  trainId: string;
  price: number;
  seatsLeft: number;
  /** Back to the results the user came from, with their search intact. */
  backHref: string;
}

const IDLE: BookingState = { status: "idle" };

/**
 * There is deliberately no optimistic UI here. Showing a booking as done before
 * the server has agreed is exactly the false availability the brief calls out;
 * the only number ever displayed as fact is one the server sent back.
 */
export function BookingForm({
  trainId,
  price,
  seatsLeft,
  backHref,
}: BookingFormProps) {
  const [state, formAction, isPending] = useActionState(bookSeats, IDLE);
  const [seats, setSeats] = useState(1);

  if (state.status === "confirmed") {
    return (
      <BookingConfirmation state={state} price={price} backHref={backHref} />
    );
  }

  // After a conflict the server's count replaces the one the page was rendered
  // with, so the form cannot invite the same impossible request twice.
  const available =
    state.status === "sold_out" && state.seatsLeft !== undefined
      ? state.seatsLeft
      : seatsLeft;

  return (
    <section className="border-border bg-surface grid gap-4 rounded-xl border p-4 sm:p-5">
      {/* "Book seats" over a section with nothing to book reads as a control
          that is missing rather than a train that is full. */}
      <h2 className="text-lg font-semibold">
        {available === 0 ? "Fully booked" : "Book seats"}
      </h2>

      {state.status === "sold_out" && (
        <SoldOutNotice seatsLeft={state.seatsLeft} backHref={backHref} />
      )}

      {state.status === "failed" && (
        <div role="alert" className="grid gap-1">
          <p className="font-medium">{state.title}</p>
          <p className="text-muted text-sm">{state.detail}</p>
        </div>
      )}

      {available === 0 ? (
        // The conflict notice already carries a way onward; a second identical
        // link beside it is just noise.
        state.status === "sold_out" ? null : (
          <Link href={backHref} className="w-fit text-sm underline">
            See the other trains on this route
          </Link>
        )
      ) : (
        <form
          action={formAction}
          className="grid gap-4 sm:grid-cols-[8rem_1fr] sm:items-end"
        >
          <input type="hidden" name="trainId" value={trainId} />

          <div className="grid gap-1.5">
            <label htmlFor="seats" className="text-sm font-medium">
              Seats
            </label>
            <input
              id="seats"
              name="seats"
              type="number"
              inputMode="numeric"
              min={1}
              max={available}
              step={1}
              required
              value={seats}
              onChange={(event) => {
                setSeats(event.target.valueAsNumber);
              }}
              className="border-border bg-background focus-visible:outline-foreground h-11 w-full rounded-lg border px-3 focus-visible:outline-2 focus-visible:outline-offset-2"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="bg-foreground text-background h-11 rounded-lg px-4 font-medium disabled:opacity-60"
          >
            {isPending
              ? "Booking…"
              : `Book for ${formatPrice(price * (seats || 1))}`}
          </button>
        </form>
      )}
    </section>
  );
}

function SoldOutNotice({
  seatsLeft,
  backHref,
}: {
  seatsLeft: number | undefined;
  backHref: string;
}) {
  return (
    <div role="alert" className="grid gap-2">
      <p className="font-medium">Not enough seats left</p>
      <p className="text-muted text-sm">
        {seatsLeft === undefined
          ? "Someone booked them while you were deciding."
          : seatsLeft === 0
            ? "This train has just sold out."
            : `Someone booked them while you were deciding. ${String(seatsLeft)} ${seatsLeft === 1 ? "seat is" : "seats are"} left.`}
      </p>
      {/* A conflict is a dead end unless there is a way onward, and the way
          onward is the other trains from the same search. */}
      <Link href={backHref} className="w-fit text-sm underline">
        Back to the other trains on this route
      </Link>
    </div>
  );
}

function BookingConfirmation({
  state,
  price,
  backHref,
}: {
  state: Extract<BookingState, { status: "confirmed" }>;
  price: number;
  backHref: string;
}) {
  return (
    <section
      role="status"
      className="border-border bg-surface grid gap-3 rounded-xl border p-4 sm:p-5"
    >
      <h2 className="text-lg font-semibold">Booking confirmed</h2>
      <p>
        {state.seats} {state.seats === 1 ? "seat" : "seats"} for{" "}
        {formatPrice(price * state.seats)}.
      </p>
      <dl className="text-muted grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt>Reference</dt>
          <dd className="font-mono">{state.reference}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Seats now left on this train</dt>
          {/* The figure from the 201 body: the server's own count, not ours. */}
          <dd>{state.seatsLeft}</dd>
        </div>
      </dl>
      <Link href={backHref} className="w-fit text-sm underline">
        Back to the results
      </Link>
    </section>
  );
}
