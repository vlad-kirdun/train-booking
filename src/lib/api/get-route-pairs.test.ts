import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { makeTrain } from "@/test/fixtures";
import { server } from "@/test/msw/server";

import { DEFAULT_API_BASE_URL } from "./config";
import { getRoutePairs } from "./get-route-pairs";

const api = (path: string) => `${DEFAULT_API_BASE_URL}${path}`;

function respondWith(
  routes: [from: string, to: string][],
  stations: Record<string, { code: string; name: string; country: string }> = {
    berlin: { code: "BER", name: "Berlin", country: "Germany" },
    munich: { code: "MUC", name: "Munich", country: "Germany" },
    hamburg: { code: "HAM", name: "Hamburg", country: "Germany" },
  },
) {
  server.use(
    http.get(api("/stations"), () => HttpResponse.json(stations)),
    http.get(api("/trains"), () =>
      HttpResponse.json({
        data: routes.map(([from, to]) => makeTrain({ from, to })),
        total: routes.length,
        page: 1,
        limit: 1000,
      }),
    ),
  );
}

test("collapses the dataset into the routes that actually run", async () => {
  respondWith([
    ["Berlin", "Munich"],
    ["Berlin", "Munich"],
    ["Hamburg", "Berlin"],
  ]);

  await expect(getRoutePairs()).resolves.toEqual([
    {
      fromSlug: "berlin",
      toSlug: "munich",
      fromName: "Berlin",
      toName: "Munich",
      trains: 2,
    },
    {
      fromSlug: "hamburg",
      toSlug: "berlin",
      fromName: "Hamburg",
      toName: "Berlin",
      trains: 1,
    },
  ]);
});

test("treats the two directions as different routes", async () => {
  respondWith([
    ["Berlin", "Munich"],
    ["Munich", "Berlin"],
  ]);

  const pairs = await getRoutePairs();

  expect(pairs).toHaveLength(2);
});

// Trains name their endpoints; URLs need slugs. A station missing from the
// directory cannot be linked to, so it is left out rather than guessed at.
test("skips a route whose station the directory does not list", async () => {
  respondWith([
    ["Berlin", "Atlantis"],
    ["Berlin", "Munich"],
  ]);

  const pairs = await getRoutePairs();

  expect(pairs.map((pair) => pair.toSlug)).toEqual(["munich"]);
});

test("orders equally busy routes predictably", async () => {
  respondWith([
    ["Munich", "Berlin"],
    ["Berlin", "Munich"],
    ["Hamburg", "Berlin"],
  ]);

  const pairs = await getRoutePairs();

  // Same number of trains each, so the tie-break decides — otherwise the
  // sitemap and the hub would reshuffle between builds.
  expect(pairs.map((pair) => `${pair.fromSlug}-${pair.toSlug}`)).toEqual([
    "berlin-munich",
    "hamburg-berlin",
    "munich-berlin",
  ]);
});

test("falls through to the destination when routes share an origin", async () => {
  respondWith([
    ["Berlin", "Munich"],
    ["Berlin", "Hamburg"],
  ]);

  const pairs = await getRoutePairs();

  expect(pairs.map((pair) => pair.toSlug)).toEqual(["hamburg", "munich"]);
});
