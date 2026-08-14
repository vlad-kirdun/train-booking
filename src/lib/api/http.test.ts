import { delay, http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";

import { server } from "@/test/msw/server";

import { DEFAULT_API_BASE_URL } from "./config";
import { ApiError } from "./errors";
import { apiRequest } from "./http";

const schema = z.object({ ok: z.boolean() });
const endpoint = `${DEFAULT_API_BASE_URL}/thing`;

/** Retries are real code paths, but their backoff pauses have no business slowing tests down. */
const noBackoff = { retry: { baseDelayMs: 0 } };

function request(overrides: Partial<Parameters<typeof apiRequest>[0]> = {}) {
  return apiRequest({ path: "/thing", schema, ...noBackoff, ...overrides });
}

async function expectApiError(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe("successful requests", () => {
  test("returns the parsed body", async () => {
    server.use(http.get(endpoint, () => HttpResponse.json({ ok: true })));

    await expect(request()).resolves.toEqual({ ok: true });
  });

  test("omits undefined and null query parameters and stringifies numbers", async () => {
    const seen = vi.fn<(url: string) => void>();
    server.use(
      http.get(endpoint, ({ request: received }) => {
        seen(new URL(received.url).search);
        return HttpResponse.json({ ok: true });
      }),
    );

    await request({
      query: { from: "berlin", date: undefined, sortBy: null, page: 2 },
    });

    expect(seen).toHaveBeenCalledWith("?from=berlin&page=2");
  });

  test("passes the Next caching options through to fetch", async () => {
    const init = vi.fn<(value: RequestInit) => void>();
    const originalFetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, options) => {
      init(options ?? {});
      return originalFetch(input, options);
    });
    server.use(http.get(endpoint, () => HttpResponse.json({ ok: true })));

    await request({
      cache: "force-cache",
      revalidate: 60,
      tags: ["trains"],
    });

    // Caching is opt-in since Next 16: without these reaching fetch, the cached
    // route dataset would silently become an upstream call on every render.
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        cache: "force-cache",
        next: { revalidate: 60, tags: ["trains"] },
      }),
    );

    vi.mocked(globalThis.fetch).mockRestore();
  });

  test("sends a JSON body for POST requests", async () => {
    const seen = vi.fn<(body: unknown) => void>();
    server.use(
      http.post(endpoint, async ({ request: received }) => {
        seen(await received.json());
        return HttpResponse.json({ ok: true });
      }),
    );

    await request({ method: "POST", body: { seats: 2 } });

    expect(seen).toHaveBeenCalledWith({ seats: 2 });
  });
});

describe("error mapping", () => {
  test.each([
    { status: 400, kind: "bad_request" },
    { status: 403, kind: "bad_request" },
    { status: 404, kind: "not_found" },
    { status: 409, kind: "conflict" },
    { status: 500, kind: "server_error" },
  ])("maps $status to $kind", async ({ status, kind }) => {
    server.use(
      http.get(endpoint, () =>
        HttpResponse.json({ error: "upstream says no" }, { status }),
      ),
    );

    const error = await expectApiError(request({ retry: { attempts: 0 } }));

    expect(error.kind).toBe(kind);
    expect(error.status).toBe(status);
    expect(error.detail).toBe("upstream says no");
    expect(error.message).toContain("upstream says no");
  });

  test("survives an error body that is not JSON", async () => {
    server.use(
      http.get(
        endpoint,
        () => new HttpResponse("<html>502</html>", { status: 404 }),
      ),
    );

    const error = await expectApiError(request());

    expect(error.kind).toBe("not_found");
    expect(error.detail).toBeUndefined();
  });

  test("survives an error body without the expected error field", async () => {
    server.use(
      http.get(endpoint, () =>
        HttpResponse.json({ oops: true }, { status: 400 }),
      ),
    );

    const error = await expectApiError(request());

    expect(error.detail).toBeUndefined();
  });

  test("reports a body that is not valid JSON as an invalid response", async () => {
    server.use(http.get(endpoint, () => new HttpResponse("not json")));

    const error = await expectApiError(request());

    expect(error.kind).toBe("invalid_response");
  });

  test("reports a body that does not match the schema as an invalid response", async () => {
    server.use(http.get(endpoint, () => HttpResponse.json({ ok: "yes" })));

    const error = await expectApiError(request());

    expect(error.kind).toBe("invalid_response");
  });

  test("reports an unreachable API as a network error", async () => {
    server.use(http.get(endpoint, () => HttpResponse.error()));

    const error = await expectApiError(request());

    expect(error.kind).toBe("network");
  });

  test("reports a slow API as a timeout rather than a network error", async () => {
    server.use(
      http.get(endpoint, async () => {
        await delay(200);
        return HttpResponse.json({ ok: true });
      }),
    );

    const error = await expectApiError(
      request({ timeoutMs: 20, retry: { attempts: 0 } }),
    );

    expect(error.kind).toBe("timeout");
  });

  test("passes a caller-driven cancellation through untouched", async () => {
    server.use(
      http.get(endpoint, async () => {
        await delay(200);
        return HttpResponse.json({ ok: true });
      }),
    );
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 10);

    const error: unknown = await request({ signal: controller.signal }).catch(
      (caught: unknown) => caught,
    );

    // A deliberate cancellation is not an API failure, so it must not be
    // reported as one — nothing should show the user an error screen for it.
    expect(error).not.toBeInstanceOf(ApiError);
  });
});

// A hung API costs the per-attempt timeout once per attempt. Without a ceiling
// on the whole call that is half a minute of skeleton, which is precisely the
// "looks broken" the loading states exist to prevent.
describe("the total time budget", () => {
  const hang = () =>
    server.use(
      http.get(endpoint, async () => {
        await delay(5_000);
        return HttpResponse.json({ ok: true });
      }),
    );

  test("caps a single attempt at whatever is left of the budget", async () => {
    hang();
    const startedAt = Date.now();

    const error = await expectApiError(
      request({ timeoutMs: 5_000, budgetMs: 150, retry: { attempts: 0 } }),
    );

    expect(error.kind).toBe("timeout");
    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });

  test("stops retrying once the budget is spent", async () => {
    let calls = 0;
    server.use(
      http.get(endpoint, async () => {
        calls += 1;
        await delay(5_000);
        return HttpResponse.json({ ok: true });
      }),
    );
    const startedAt = Date.now();

    await expectApiError(
      request({ timeoutMs: 5_000, budgetMs: 200, retry: { attempts: 5 } }),
    );

    expect(Date.now() - startedAt).toBeLessThan(1_500);
    expect(calls).toBeLessThan(5);
  });
});

describe("retries", () => {
  test("retries a failing GET and succeeds once the API recovers", async () => {
    let calls = 0;
    server.use(
      http.get(endpoint, () => {
        calls += 1;
        return calls < 3
          ? HttpResponse.json({ error: "boom" }, { status: 500 })
          : HttpResponse.json({ ok: true });
      }),
    );

    await expect(request()).resolves.toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  test("gives up after the configured number of attempts", async () => {
    let calls = 0;
    server.use(
      http.get(endpoint, () => {
        calls += 1;
        return HttpResponse.json({ error: "boom" }, { status: 500 });
      }),
    );

    await expectApiError(request({ retry: { attempts: 1, baseDelayMs: 0 } }));

    expect(calls).toBe(2);
  });

  test("does not retry a client error", async () => {
    let calls = 0;
    server.use(
      http.get(endpoint, () => {
        calls += 1;
        return HttpResponse.json({ error: "nope" }, { status: 404 });
      }),
    );

    await expectApiError(request());

    expect(calls).toBe(1);
  });

  test("never retries a POST, so a booking cannot be placed twice", async () => {
    let calls = 0;
    server.use(
      http.post(endpoint, () => {
        calls += 1;
        return HttpResponse.json({ error: "boom" }, { status: 500 });
      }),
    );

    await expectApiError(request({ method: "POST", body: {} }));

    expect(calls).toBe(1);
  });
});
