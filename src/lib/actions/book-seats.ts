"use server";

import { updateTag } from "next/cache";

import {
  createBooking,
  describeApiFailure,
  getTrain,
  isApiError,
  TRAINS_CACHE_TAG,
} from "@/lib/api";

/**
 * Outcomes of a booking attempt, as data rather than exceptions.
 *
 * The brief makes "not enough seats" a first-class user flow, not an edge case,
 * so it gets its own state with the real remaining count attached. Every branch
 * is then an ordinary render instead of something caught in a boundary.
 */
export type BookingState =
  | { status: "idle" }
  | {
      status: "confirmed";
      reference: string;
      seats: number;
      /** Straight from the 201 body — no second request needed. */
      seatsLeft: number;
    }
  | {
      status: "sold_out";
      /** Undefined only if re-reading the train also failed. */
      seatsLeft: number | undefined;
    }
  | { status: "failed"; title: string; detail: string };

export async function bookSeats(
  _previous: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const trainId = readText(formData, "trainId");
  const seats = Number(readText(formData, "seats"));

  // Validated here as well as in the client, because a Server Action is a
  // public endpoint. The API treats a falsy seat count as 1 and answers 201,
  // so nothing downstream would object.
  if (!Number.isInteger(seats) || seats < 1) {
    return {
      status: "failed",
      title: "Choose how many seats you need",
      detail: "The number of seats has to be at least one.",
    };
  }

  try {
    const booking = await createBooking({ trainId, seats });

    // Immediate expiry rather than stale-while-revalidate: the lists would
    // otherwise keep showing the seat count this booking just changed.
    updateTag(TRAINS_CACHE_TAG);

    return {
      status: "confirmed",
      reference: booking.id,
      seats: booking.seats,
      seatsLeft: booking.seatsLeft,
    };
  } catch (error) {
    if (isApiError(error) && error.kind === "conflict") {
      // The seat count the user acted on was wrong, so every cached list
      // holding it is wrong too.
      updateTag(TRAINS_CACHE_TAG);

      return { status: "sold_out", seatsLeft: await readSeatsLeft(trainId) };
    }

    const { title, detail } = describeApiFailure(error);
    return { status: "failed", title, detail };
  }
}

/**
 * A form field is a string or a File. Anything that is not a string came from a
 * hand-rolled request, and stringifying a File would quietly produce
 * "[object File]" rather than being rejected.
 */
function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * The whole point of the conflict branch is telling the user what is actually
 * left, so this is read fresh. If even that fails, the message degrades to "not
 * enough seats" rather than the flow collapsing into a generic error.
 */
async function readSeatsLeft(trainId: string): Promise<number | undefined> {
  return getTrain(trainId, { cache: "no-store" }).then(
    (train) => train.seatsLeft,
    () => undefined,
  );
}
