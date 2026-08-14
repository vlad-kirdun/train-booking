import { describe, expect, test } from "vitest";

import type { Station } from "@/lib/api";

import { resolveRoute, routeDescription, routeTitle } from "./route";

const stations: Station[] = [
  { slug: "berlin", code: "BER", name: "Berlin", country: "Germany" },
  { slug: "munich", code: "MUC", name: "Munich", country: "Germany" },
];

describe("resolveRoute", () => {
  test("resolves both ends of a route", () => {
    const route = resolveRoute({ from: "berlin", to: "munich" }, stations);

    expect(route.from?.name).toBe("Berlin");
    expect(route.to?.name).toBe("Munich");
    expect(route.unknown).toEqual([]);
  });

  test("leaves an unset end alone", () => {
    const route = resolveRoute({ from: "berlin", to: undefined }, stations);

    expect(route.to).toBeUndefined();
    expect(route.unknown).toEqual([]);
  });

  // A shared link can name a station that does not exist. Searching every route
  // instead would show results that contradict the address bar, so the page
  // reports the slug it could not place.
  test("reports a slug that names no station", () => {
    const route = resolveRoute({ from: "atlantis", to: "munich" }, stations);

    expect(route.from).toBeUndefined();
    expect(route.unknown).toEqual(["atlantis"]);
  });

  test("reports both ends when neither exists", () => {
    const route = resolveRoute({ from: "atlantis", to: "narnia" }, stations);

    expect(route.unknown).toEqual(["atlantis", "narnia"]);
  });
});

describe("routeTitle", () => {
  const route = (from?: Station, to?: Station) => ({
    from,
    to,
    unknown: [],
  });

  test("phrases a full route the way people search for it", () => {
    expect(routeTitle(route(stations[0], stations[1]))).toBe(
      "Berlin to Munich trains",
    );
  });

  test("handles one end and no ends", () => {
    expect(routeTitle(route(stations[0]))).toBe("Trains from Berlin");
    expect(routeTitle(route(undefined, stations[1]))).toBe("Trains to Munich");
    expect(routeTitle(route())).toBe("All trains");
  });

  test("describes each case for the meta description", () => {
    expect(routeDescription(route(stations[0], stations[1]))).toContain(
      "Berlin to Munich",
    );
    expect(routeDescription(route(stations[0]))).toContain("from Berlin");
    expect(routeDescription(route(undefined, stations[1]))).toContain(
      "in Munich",
    );
    expect(routeDescription(route())).toContain("Search trains");
  });
});
