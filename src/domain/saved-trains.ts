import { z } from "zod";

import type { Train } from "@/lib/api";

/**
 * A shortlist is for comparing three or four trains, not for hoarding. The cap
 * also bounds what a single `localStorage` key can grow to, which matters
 * because a quota error on write is silent.
 */
export const SAVED_TRAINS_LIMIT = 20;

/**
 * What a saved train remembers.
 *
 * Deliberately not `seatsLeft`. A seat count frozen at the moment of saving is
 * the exact kind of false availability this project refuses to show; the saved
 * card links to the train's own page, which reads the real figure.
 */
export const savedTrainSchema = z.object({
  id: z.string(),
  trainNumber: z.string(),
  from: z.string(),
  to: z.string(),
  departureDate: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  price: z.number(),
  carriageClass: z.string(),
  savedAt: z.number(),
});

export type SavedTrain = z.infer<typeof savedTrainSchema>;

export function toSavedTrain(train: Train, savedAt: number): SavedTrain {
  return {
    id: train.id,
    trainNumber: train.trainNumber,
    from: train.from,
    to: train.to,
    departureDate: train.departureDate,
    departureTime: train.departureTime,
    arrivalTime: train.arrivalTime,
    price: train.price,
    carriageClass: train.carriageClass,
    savedAt,
  };
}

/**
 * Reads whatever is in storage and returns what can be trusted.
 *
 * This is user-writable state that outlives deploys, so every layer of it is
 * suspect: not JSON at all, JSON that is not a list, a list holding entries
 * from an older shape. A single bad entry drops out; it does not take the rest
 * of somebody's shortlist with it.
 */
export function parseSavedTrains(raw: string | null): SavedTrain[] {
  if (raw === null || raw === "") return [];

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(payload)) return [];

  return payload
    .map((entry) => savedTrainSchema.safeParse(entry))
    .filter((result) => result.success)
    .map((result) => result.data)
    .slice(0, SAVED_TRAINS_LIMIT);
}

/** Most recently saved first, without duplicates, capped. */
export function addSavedTrain(
  saved: readonly SavedTrain[],
  train: SavedTrain,
): SavedTrain[] {
  return [
    train,
    ...saved.filter((candidate) => candidate.id !== train.id),
  ].slice(0, SAVED_TRAINS_LIMIT);
}

export function removeSavedTrain(
  saved: readonly SavedTrain[],
  id: string,
): SavedTrain[] {
  return saved.filter((candidate) => candidate.id !== id);
}

export function isTrainSaved(
  saved: readonly SavedTrain[],
  id: string,
): boolean {
  return saved.some((candidate) => candidate.id === id);
}
