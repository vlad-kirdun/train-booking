import type { Train } from "@/lib/api";

let sequence = 0;

/**
 * A valid train, shaped exactly like the real API's payload. Tests override only
 * the fields they are actually about, so a schema change breaks one factory
 * rather than every suite.
 */
export function makeTrain(overrides: Partial<Train> = {}): Train {
  sequence += 1;
  const id = String(sequence);

  return {
    id,
    trainNumber: `ICE ${id}`,
    from: "Berlin",
    to: "Munich",
    departureDate: "2026-08-15",
    departureTime: "08:10",
    arrivalTime: "12:45",
    price: 89,
    seatsLeft: 34,
    totalSeats: 60,
    carriageClass: "2nd Class",
    image: `https://picsum.photos/seed/train${id}/400/300`,
    ...overrides,
  };
}
