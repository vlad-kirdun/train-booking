import { ApiError } from "./errors";
import { apiRequest, type CallOptions } from "./http";
import {
  type Booking,
  bookingSchema,
  type Station,
  stationsResponseSchema,
  type Train,
  type TrainListResponse,
  trainListResponseSchema,
  trainSchema,
} from "./schemas";

export interface TrainListParams {
  from?: string;
  to?: string;
  /**
   * `YYYY-MM-DD`. Undocumented in the assignment's endpoint table but supported
   * by the API; omitting it searches across all dates, which is exactly the
   * "date is optional" behaviour the product needs.
   */
  date?: string;
  sortBy?: "price" | "departureTime" | "date";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export function getTrains(
  params: TrainListParams = {},
  options: CallOptions = {},
): Promise<TrainListResponse> {
  return apiRequest({
    path: "/trains",
    query: { ...params },
    schema: trainListResponseSchema,
    ...options,
  });
}

export function getTrain(
  id: string,
  options: CallOptions = {},
): Promise<Train> {
  return apiRequest({
    path: `/trains/${encodeURIComponent(id)}`,
    schema: trainSchema,
    ...options,
  });
}

export async function getStations(
  options: CallOptions = {},
): Promise<Station[]> {
  const stations = await apiRequest({
    path: "/stations",
    schema: stationsResponseSchema,
    ...options,
  });

  return Object.entries(stations)
    .map(([slug, station]) => ({ slug, ...station }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface CreateBookingInput {
  trainId: string;
  seats: number;
}

export function createBooking(
  { trainId, seats }: CreateBookingInput,
  options: CallOptions = {},
): Promise<Booking> {
  // The API treats a falsy `seats` as 1 and answers 201, so a zero would be
  // silently turned into a real booking instead of being rejected. Guard here.
  if (!Number.isInteger(seats) || seats < 1) {
    return Promise.reject(
      new ApiError({
        kind: "bad_request",
        message: `Cannot book ${String(seats)} seats: the number of seats must be a positive integer`,
      }),
    );
  }

  return apiRequest({
    path: "/bookings",
    method: "POST",
    body: { trainId, seats },
    schema: bookingSchema,
    ...options,
  });
}
