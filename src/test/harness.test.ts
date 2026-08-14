import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { server } from "./msw/server";

// Guards the test harness itself: if MSW ever stops intercepting, every API test
// in the suite would silently hit the real service instead of failing.
test("MSW intercepts fetch instead of reaching the network", async () => {
  server.use(
    http.get("https://example.test/ping", () =>
      HttpResponse.json({ pong: true }),
    ),
  );

  const response = await fetch("https://example.test/ping");

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ pong: true });
});

test("an unhandled request fails the test instead of escaping to the network", async () => {
  await expect(fetch("https://example.test/not-mocked")).rejects.toThrow();
});
