import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";

import { makeTrain } from "@/test/fixtures";
import { server } from "@/test/msw/server";

import { DEFAULT_API_BASE_URL } from "./config";
import { createBooking, getStations, getTrain, getTrains } from "./endpoints";
import { ApiError } from "./errors";

const api = (path: string) => `${DEFAULT_API_BASE_URL}${path}`;
const noBackoff = { retry: { baseDelayMs: 0 } };

describe("getTrains", () => {
  test("forwards the search parameters and returns the parsed page", async () => {
    const seen = vi.fn<(search: string) => void>();
    const train = makeTrain();
    server.use(
      http.get(api("/trains"), ({ request }) => {
        seen(new URL(request.url).search);
        return HttpResponse.json({
          data: [train],
          total: 1,
          page: 1,
          limit: 20,
        });
      }),
    );

    const result = await getTrains(
      { from: "berlin", to: "munich", date: "2026-08-15", limit: 20 },
      noBackoff,
    );

    expect(seen).toHaveBeenCalledWith(
      "?from=berlin&to=munich&date=2026-08-15&limit=20",
    );
    expect(result.data).toEqual([train]);
    expect(result.total).toBe(1);
  });

  test("rejects a page whose trains do not match the schema", async () => {
    server.use(
      http.get(api("/trains"), () =>
        HttpResponse.json({
          // A date in the wrong format would silently break the date filter.
          data: [makeTrain({ departureDate: "15.08.2026" })],
          total: 1,
          page: 1,
          limit: 20,
        }),
      ),
    );

    await expect(getTrains({}, noBackoff)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });
});

describe("getTrain", () => {
  test("returns a single train", async () => {
    const train = makeTrain({ id: "42" });
    server.use(http.get(api("/trains/42"), () => HttpResponse.json(train)));

    await expect(getTrain("42", noBackoff)).resolves.toEqual(train);
  });

  test("escapes the id so it cannot alter the request path", async () => {
    server.use(
      http.get(api("/trains/..%2Freset"), () =>
        HttpResponse.json(makeTrain({ id: "../reset" })),
      ),
    );

    await expect(getTrain("../reset", noBackoff)).resolves.toMatchObject({
      id: "../reset",
    });
  });

  test("surfaces a missing train as not_found", async () => {
    server.use(
      http.get(api("/trains/999"), () =>
        HttpResponse.json({ error: "Train not found" }, { status: 404 }),
      ),
    );

    await expect(getTrain("999", noBackoff)).rejects.toMatchObject({
      kind: "not_found",
      detail: "Train not found",
    });
  });
});

describe("getStations", () => {
  test("flattens the slug-keyed dictionary into a list sorted by name", async () => {
    server.use(
      http.get(api("/stations"), () =>
        HttpResponse.json({
          munich: { code: "MUC", name: "Munich", country: "Germany" },
          berlin: { code: "BER", name: "Berlin", country: "Germany" },
        }),
      ),
    );

    await expect(getStations(noBackoff)).resolves.toEqual([
      { slug: "berlin", code: "BER", name: "Berlin", country: "Germany" },
      { slug: "munich", code: "MUC", name: "Munich", country: "Germany" },
    ]);
  });
});

describe("createBooking", () => {
  test("returns the booking with the authoritative seat count", async () => {
    server.use(
      http.post(api("/bookings"), () =>
        HttpResponse.json(
          {
            id: "bk_1",
            trainId: "1",
            seats: 2,
            seatsLeft: 32,
            status: "confirmed",
            createdAt: "2026-08-15T10:00:00.000Z",
          },
          { status: 201 },
        ),
      ),
    );

    await expect(
      createBooking({ trainId: "1", seats: 2 }, noBackoff),
    ).resolves.toMatchObject({ seatsLeft: 32, status: "confirmed" });
  });

  test("surfaces a sold-out train as conflict", async () => {
    server.use(
      http.post(api("/bookings"), () =>
        HttpResponse.json(
          { error: "Not enough seats left on this train" },
          { status: 409 },
        ),
      ),
    );

    await expect(
      createBooking({ trainId: "1", seats: 99 }, noBackoff),
    ).rejects.toMatchObject({
      kind: "conflict",
      detail: "Not enough seats left on this train",
    });
  });

  test("surfaces an unknown train as bad_request", async () => {
    server.use(
      http.post(api("/bookings"), () =>
        HttpResponse.json(
          { error: "trainId is required and must reference an existing train" },
          { status: 400 },
        ),
      ),
    );

    await expect(
      createBooking({ trainId: "nope", seats: 1 }, noBackoff),
    ).rejects.toMatchObject({ kind: "bad_request" });
  });

  // The API answers 201 to `seats: 0` and books one seat anyway, so rejecting
  // this locally is the only thing standing between a mis-click and a booking
  // the user never asked for.
  test.each([0, -1, 1.5, Number.NaN])(
    "refuses to send %p seats and never reaches the API",
    async (seats) => {
      let calls = 0;
      server.use(
        http.post(api("/bookings"), () => {
          calls += 1;
          return HttpResponse.json({}, { status: 201 });
        }),
      );

      const error: unknown = await createBooking(
        { trainId: "1", seats },
        noBackoff,
      ).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).kind).toBe("bad_request");
      expect(calls).toBe(0);
    },
  );
});
