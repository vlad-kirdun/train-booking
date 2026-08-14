import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected a YYYY-MM-DD date");

const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "expected an HH:MM time");

/**
 * Formats are validated, not just types. `departureDate` feeds the `date` query
 * parameter and both times are rendered directly, so drift in either would
 * surface as a broken filter or a broken card rather than a loud error.
 */
export const trainSchema = z.object({
  id: z.string(),
  trainNumber: z.string(),
  from: z.string(),
  to: z.string(),
  departureDate: isoDate,
  departureTime: clockTime,
  arrivalTime: clockTime,
  price: z.number(),
  seatsLeft: z.number().int().nonnegative(),
  totalSeats: z.number().int().positive(),
  carriageClass: z.string(),
  image: z.string(),
});

export type Train = z.infer<typeof trainSchema>;

export const trainListResponseSchema = z.object({
  data: z.array(trainSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type TrainListResponse = z.infer<typeof trainListResponseSchema>;

/**
 * `/stations` returns a dictionary keyed by slug, not an array:
 * `{ "berlin": { code, name, country }, ... }`.
 */
export const stationsResponseSchema = z.record(
  z.string(),
  z.object({
    code: z.string(),
    name: z.string(),
    country: z.string(),
  }),
);

/** The dictionary flattened into the shape the UI actually needs. */
export interface Station {
  slug: string;
  code: string;
  name: string;
  country: string;
}

export const bookingSchema = z.object({
  id: z.string(),
  trainId: z.string(),
  seats: z.number().int().positive(),
  // The authoritative seat count after the booking was applied.
  seatsLeft: z.number().int().nonnegative(),
  status: z.string(),
  createdAt: z.string(),
});

export type Booking = z.infer<typeof bookingSchema>;

/** Shared error envelope: 400, 404 and 409 all answer with `{ error: string }`. */
export const apiErrorBodySchema = z.object({ error: z.string() });
