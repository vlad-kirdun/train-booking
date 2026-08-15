import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { DEFAULT_API_BASE_URL } from "@/lib/api";
import { makeTrain } from "@/test/fixtures";
import { server } from "@/test/msw/server";

import { bookSeats, type BookingState } from "./book-seats";

// The only mock in the suite, and it is the framework boundary rather than one
// of our modules: cache invalidation has no meaning outside a request.
const updateTag = vi.fn();
vi.mock("next/cache", () => ({
  updateTag: (tag: string) => {
    updateTag(tag);
  },
}));

const api = (path: string) => `${DEFAULT_API_BASE_URL}${path}`;
const IDLE: BookingState = { status: "idle" };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => {
  updateTag.mockClear();
});

describe("a successful booking", () => {
  beforeEach(() => {
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
  });

  // The 201 body carries the authoritative count, so there is nothing to guess
  // and no second request to make.
  test("reports the server's own remaining count", async () => {
    const state = await bookSeats(IDLE, form({ trainId: "1", seats: "2" }));

    expect(state).toEqual({
      status: "confirmed",
      reference: "bk_1",
      seats: 2,
      seatsLeft: 32,
    });
  });

  test("expires the cached lists that still show the old count", async () => {
    await bookSeats(IDLE, form({ trainId: "1", seats: "2" }));

    expect(updateTag).toHaveBeenCalledWith("trains");
  });
});

// The branch the brief singles out: a primary flow, not an edge case.
describe("when the seats are gone", () => {
  beforeEach(() => {
    server.use(
      http.post(api("/bookings"), () =>
        HttpResponse.json(
          { error: "Not enough seats left on this train" },
          { status: 409 },
        ),
      ),
    );
  });

  test("re-reads the train so the user is told what is actually left", async () => {
    server.use(
      http.get(api("/trains/1"), () =>
        HttpResponse.json(makeTrain({ id: "1", seatsLeft: 3 })),
      ),
    );

    const state = await bookSeats(IDLE, form({ trainId: "1", seats: "9" }));

    expect(state).toEqual({ status: "sold_out", seatsLeft: 3 });
  });

  test("still reports the conflict when the re-read also fails", async () => {
    server.use(http.get(api("/trains/1"), () => HttpResponse.error()));

    const state = await bookSeats(IDLE, form({ trainId: "1", seats: "9" }));

    // Degraded, not collapsed: the user is told the seats are gone even though
    // we cannot say how many remain.
    expect(state).toEqual({ status: "sold_out", seatsLeft: undefined });
  });

  // The count the user acted on was demonstrably wrong, so every list holding
  // it is wrong too.
  test("expires the cached lists as well", async () => {
    server.use(
      http.get(api("/trains/1"), () =>
        HttpResponse.json(makeTrain({ id: "1", seatsLeft: 3 })),
      ),
    );

    await bookSeats(IDLE, form({ trainId: "1", seats: "9" }));

    expect(updateTag).toHaveBeenCalledWith("trains");
  });
});

describe("other failures", () => {
  test("distinguishes an unknown train from a lost seat", async () => {
    server.use(
      http.post(api("/bookings"), () =>
        HttpResponse.json(
          { error: "trainId is required and must reference an existing train" },
          { status: 400 },
        ),
      ),
    );

    const state = await bookSeats(IDLE, form({ trainId: "nope", seats: "1" }));

    expect(state).toMatchObject({ status: "failed" });
  });

  test("reports an unreachable API without pretending anything was booked", async () => {
    server.use(http.post(api("/bookings"), () => HttpResponse.error()));

    const state = await bookSeats(IDLE, form({ trainId: "1", seats: "1" }));

    expect(state).toMatchObject({
      status: "failed",
      title: "We could not reach the timetable service",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

// A Server Action is a public endpoint, and the API answers 201 to a falsy seat
// count by booking one seat. Nothing downstream would object, so this must not
// reach the network at all.
describe("seat counts that must never be sent", () => {
  test.each(["0", "-1", "1.5", "", "two"])(
    "refuses %p without calling the API",
    async (seats) => {
      let calls = 0;
      server.use(
        http.post(api("/bookings"), () => {
          calls += 1;
          return HttpResponse.json({}, { status: 201 });
        }),
      );

      const state = await bookSeats(IDLE, form({ trainId: "1", seats }));

      expect(state).toMatchObject({
        status: "failed",
        title: "Choose how many seats you need",
      });
      expect(calls).toBe(0);
    },
  );

  test("refuses a request with no seats field at all", async () => {
    const state = await bookSeats(IDLE, form({ trainId: "1" }));

    expect(state).toMatchObject({ status: "failed" });
  });
});

// A form field is a string or a File; stringifying a File would quietly
// produce "[object File]" and be sent to the API as a train id.
test("treats a file upload as a missing field rather than stringifying it", async () => {
  const data = new FormData();
  data.append("trainId", new File(["x"], "train.txt"));
  data.append("seats", new File(["1"], "seats.txt"));

  const state = await bookSeats(IDLE, data);

  expect(state).toMatchObject({ status: "failed" });
});

// A hand-rolled POST to the action can omit anything at all.
test("survives a submission with no train either", async () => {
  server.use(
    http.post(api("/bookings"), () =>
      HttpResponse.json(
        { error: "trainId is required and must reference an existing train" },
        { status: 400 },
      ),
    ),
  );

  const state = await bookSeats(IDLE, form({ seats: "1" }));

  expect(state).toMatchObject({ status: "failed" });
});
